import { Vacancy, KeywordScoringRule } from '../types';

export interface HhApiItem {
  id: string;
  name: string;
  alternate_url: string;
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross: boolean | null;
  } | null;
  employer: {
    name: string;
  };
  snippet: {
    requirement: string | null;
    responsibility: string | null;
  };
  area: {
    name: string;
  };
  schedule?: {
    id: string;
    name: string;
  };
  published_at: string;
  experience?: {
    name: string;
  };
}

export function parseSalaryNumber(salary: HhApiItem['salary']): number | null {
  if (!salary) return null;
  // Конвертация примерных валют в рубли для фильтрации
  const mult = salary.currency === 'USD' ? 90 : salary.currency === 'EUR' ? 98 : 1;
  if (salary.from) return Math.round(salary.from * mult);
  if (salary.to) return Math.round(salary.to * mult);
  return null;
}

export function formatSalary(salary: HhApiItem['salary']): string {
  if (!salary) return 'Зарплата не указана';
  const curr = salary.currency === 'RUR' ? '₽' : salary.currency;
  const fmt = (val: number) => val.toLocaleString('ru-RU');

  if (salary.from && salary.to) {
    return `${fmt(salary.from)} – ${fmt(salary.to)} ${curr}`;
  }
  if (salary.from) {
    return `от ${fmt(salary.from)} ${curr}`;
  }
  if (salary.to) {
    return `до ${fmt(salary.to)} ${curr}`;
  }
  return 'Договорная';
}

export function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<highlighttext>/g, '').replace(/<\/highlighttext>/g, '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Детерминированная оценка соответствия вакансии фильтрам резюме
 * (Полностью БЕЗ AI-вызовов, строго по правилам и ключевым словам)
 */
export function evaluateKeywords(
  title: string,
  desc: string,
  rules: KeywordScoringRule
): {
  score: number;
  keywordScore: number;
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  filterVerdict: string;
  isExcluded: boolean;
} {
  const text = `${title} ${desc}`.toLowerCase();

  // 1. Проверка жестких стоп-фильтров (hardExclude)
  for (const stopWord of rules.hardExclude) {
    const regex = new RegExp(`(^|[^a-zA-Zа-яА-Я0-9])${stopWord}([^a-zA-Zа-яА-Я0-9]|$)`, 'i');
    if (regex.test(text) || text.includes(stopWord.toLowerCase())) {
      return {
        score: 0,
        keywordScore: -999,
        matchPercentage: 0,
        matchedKeywords: [],
        missingKeywords: ['TypeScript', 'Node.js', 'React'],
        filterVerdict: `Отсеяно стоп-фильтром hardExclude: найдено запрещенное слово "${stopWord}"`,
        isExcluded: true,
      };
    }
  }

  // 2. Подсчет совпадений стека резюме
  let rawScore = 0;
  const matchedList: string[] = [];

  const checkGroup = (words: string[], weight: number) => {
    for (const w of words) {
      const lower = w.toLowerCase();
      if (text.includes(lower)) {
        rawScore += weight;
        const formatted = w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
        if (!matchedList.some((m) => m.toLowerCase() === lower)) {
          matchedList.push(formatted);
        }
      }
    }
  };

  checkGroup(rules.core, 10);
  checkGroup(rules.related, 5);
  if (rules.nice) {
    checkGroup(rules.nice, 2);
  }

  // Расчет процента соответствия и итогового скора 0-10
  let calculatedScore = 0;
  let matchPercentage = 0;

  if (rawScore >= 35) {
    calculatedScore = 10;
    matchPercentage = 100;
  } else if (rawScore >= 28) {
    calculatedScore = 9;
    matchPercentage = 90;
  } else if (rawScore >= 20) {
    calculatedScore = 8;
    matchPercentage = 80;
  } else if (rawScore >= 15) {
    calculatedScore = 7;
    matchPercentage = 70;
  } else if (rawScore >= 10) {
    calculatedScore = 5;
    matchPercentage = 50;
  } else if (rawScore >= 5) {
    calculatedScore = 3;
    matchPercentage = 30;
  } else {
    calculatedScore = 1;
    matchPercentage = 10;
  }

  const verdict =
    calculatedScore >= 8
      ? `Высокое совпадение с профилем резюме (${matchedList.slice(0, 5).join(', ')}). Рекомендовано к отклику.`
      : calculatedScore >= 6
      ? `Частичное совпадение стека (${matchedList.slice(0, 4).join(', ')}). Проверьте требования.`
      : `Низкое совпадение (${rawScore} pts). Основной профиль вакансии отличается.`;

  return {
    score: calculatedScore,
    keywordScore: rawScore,
    matchPercentage,
    matchedKeywords: matchedList,
    missingKeywords: [],
    filterVerdict: verdict,
    isExcluded: false,
  };
}

/**
 * Детерминированная шаблонизация отклика на базе реального резюме Дмитрия Никульшина
 * (БЕЗ использования AI, прямая подстановка кейсов под контекст стека)
 */
export function generatePitchForVacancy(title: string, matchedTags: string[]): { hook: string; pitch: string } {
  const lowerTitle = title.toLowerCase();
  const lowerTags = matchedTags.map((t) => t.toLowerCase());

  const hasNextOrNest = lowerTags.includes('next.js') || lowerTags.includes('nextjs') || lowerTags.includes('nestjs');
  const hasMobile = lowerTags.includes('react native') || lowerTags.includes('expo') || lowerTitle.includes('mobile');
  const hasPythonOrAi = lowerTags.includes('python') || lowerTags.includes('fastapi') || lowerTags.includes('rag');

  let hook = '';
  let projectHighlight = '';

  if (hasMobile) {
    hook = 'Имею готовый production-опыт разработки мобильного приложения на React Native (Expo) в связке с бэкендом на Node.js.';
    projectHighlight = `• Проект: Система мониторинга корпоративного транспорта (GitHub: corporate-transport) — клиент на React Native (Expo) для водителей, realtime-трекинг по WebSocket, React PWA для диспетчеров.`;
  } else if (hasNextOrNest) {
    hook = 'Проектировал и реализовал Helpdesk CRM на стеке NestJS + Next.js 15 (App Router, Server Actions) + Prisma + PostgreSQL.';
    projectHighlight = `• Проект: CRM поддержки и заявок (GitHub: support-ticketing-system) — бэкенд на NestJS с ролевой моделью, Next.js 15 App Router с оптимистичными обновлениями TanStack Query, Swagger API.`;
  } else if (hasPythonOrAi) {
    hook = 'Создаю микросервисы на Python (FastAPI) и Node.js, работаю с реляционными базами и векторным поиском pgvector.';
    projectHighlight = `• Проекты: DocBrain (FastAPI, pgvector, PostgreSQL) и сканер вакансий scan-agent (Playwright, Node.js, Telegram Bot).`;
  } else {
    hook = 'Закрываю полный цикл fullstack-разработки: строгий TypeScript, Node.js/Express/Fastify API, React 19 интерфейсы и базы данных PostgreSQL.';
    projectHighlight = `• Проекты: Helpdesk PWA (ООО «Связь Стандарт» — React, Express, PostgreSQL, WebSocket) и realtime-система трекинга автопарка.`;
  }

  const topTags = matchedTags.length > 0 ? matchedTags.slice(0, 4).join(', ') : 'TypeScript, React, Node.js';

  const pitch = `Здравствуйте! Заинтересовала ваша вакансия «${title}».

Мой основной стек — Fullstack-разработка на TypeScript (Node.js/NestJS + React/Next.js).
В подтверждение релевантного опыта:
${projectHighlight}
• Стек и навыки: ${topTags}, Docker, CI/CD GitHub Actions, чистая модульная архитектура, оптимизация SQL-запросов.
• Ответственный подход к срокам, готовность быстро погрузиться в кодовую базу и закрывать задачи без лишней бюрократии.

Буду рад ответить на вопросы и выполнить тестовое задание.
• Портфолио: https://dnikulshin.github.io
• GitHub: https://github.com/DNikulshin
• Telegram: @nikulshin_dev | Телефон: +7 (926) 7189408`;

  return { hook, pitch };
}

import { loadVacanciesWithCache, DEFAULT_BACKEND_URL } from './backendService';

/**
 * Получение вакансий: взаимодействие переведено исключительно на наш бэкенд (Neon/Render)
 * с кэшированием в IndexedDB. Прямые обращения к api.hh.ru полностью исключены.
 */
export async function fetchLiveHhVacancies(
  _query?: string,
  _remoteOnly?: boolean,
  _rules?: KeywordScoringRule,
  apiUrl: string = DEFAULT_BACKEND_URL
): Promise<Vacancy[]> {
  const result = await loadVacanciesWithCache(apiUrl);
  return result.vacancies;
}
