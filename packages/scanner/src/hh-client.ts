import { appEventBus, EventType } from '@scan-agent/events';
import { KeywordScoringRule, Vacancy } from '@scan-agent/shared-types';
import { evaluateVacancyByFilters } from './filter-engine.js';
import { generateCoverLetter } from './pitch-generator.js';
import { createBrowser } from './browser.js';

export interface RawHhVacancy {
  id: string;
  title: string;
  desc: string;
  price: string;
  salaryNum: number | null;
  link: string;
  employer: string;
  city: string;
}

export interface ScannerOptions {
  rules?: KeywordScoringRule;
  searchUrl?: string;
  maxPages?: number;
  onProgress?: (info: { page: number; totalPages: number; found: number }) => void;
}

/**
 * Парсер вакансий с HeadHunter (hh.ru) через Playwright
 * Без использования закрытого API HH, обходя ошибку 403.
 */
export async function runHhScannerJob(
  rulesOrOptions?: KeywordScoringRule | ScannerOptions
): Promise<Vacancy[]> {
  const options: ScannerOptions =
    rulesOrOptions && 'coreStack' in rulesOrOptions
      ? { rules: rulesOrOptions }
      : (rulesOrOptions as ScannerOptions) || {};

  const rules = options.rules || {
    coreStack: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Fastify', 'NestJS', 'PostgreSQL', 'Prisma'],
    relatedStack: ['Docker', 'Redis', 'WebSocket', 'Tailwind', 'Python', 'FastAPI'],
    niceToHave: ['Zustand', 'Vitest', 'TanStack'],
    hardExclude: ['1c', '1с', 'bitrix', 'битрикс', 'wordpress', 'tilda', 'тильда', 'тестировщик', 'qa'],
    minScore: 6,
  };

  // По умолчанию ищем вакансии для удаленной работы по релевантному стеку, отсортированные по дате
  const defaultSearchUrl =
    process.env.HH_SEARCH_URL ||
    'https://hh.ru/search/vacancy?text=TypeScript+OR+React+OR+Node.js&schedule=remote&order_by=publication_time';

  const baseUrl = options.searchUrl || defaultSearchUrl;
  // Ограничиваем число страниц (по умолчанию 2) для быстрой работы (15-20 сек) и предотвращения лимитов
  const maxPages = Number(options.maxPages ?? process.env.HH_MAX_PAGES ?? 2);

  console.log(`[HH Playwright] 🚀 Запуск сбора вакансий: страниц=${maxPages}, url=${baseUrl}`);

  const startTime = Date.now();
  const session = await createBrowser();
  const { page, close } = session;
  const allRawVacancies: RawHhVacancy[] = [];

  try {
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const pageUrl = buildHhPageUrl(baseUrl, pageNum);
      console.log(`[HH Playwright] 🌐 Страница ${pageNum + 1}/${maxPages} → ${pageUrl}`);

      try {
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 25_000,
        });

        // Проверяем наличие карточек вакансий в выдаче (поддерживаем оба варианта селекторов HH)
        const hasCards = await page
          .waitForSelector('[data-qa="vacancy-serp__vacancy"], [data-qa="serp-item__title"]', {
            timeout: 12_000,
          })
          .then(() => true)
          .catch(() => false);

        if (!hasCards) {
          console.log(`[HH Playwright] На странице ${pageNum + 1} вакансий не обнаружено или достигнут конец выдачи.`);
          break;
        }

        const vacanciesOnPage = await page.$$eval(
          '[data-qa="vacancy-serp__vacancy"]',
          (cards): (RawHhVacancy | null)[] => {
            return cards.map((card) => {
              const linkEl = (card.querySelector(
                '[data-qa="serp-item__title"]'
              ) || card.querySelector('a[href*="/vacancy/"]')) as HTMLAnchorElement | null;

              const rawHref = linkEl?.href || '';
              const link = rawHref.split('?')[0];
              if (!link) return null;

              const idMatch = link.match(/vacancy\/(\d+)/);
              const id = idMatch?.[1] || null;
              if (!id) return null;

              const titleEl =
                card.querySelector('[data-qa="serp-item__title-text"]') ||
                card.querySelector('[data-qa="serp-item__title"]');
              const title = titleEl?.textContent?.trim() || '';
              if (!title) return null;

              // Парсинг вилки зарплаты
              let price = 'Не указана';
              let salaryNum: number | null = null;
              for (const span of card.querySelectorAll('span')) {
                const t = span.textContent?.trim() || '';
                if (/([\d\s]+[₽$€]|от\s*\d|до\s*\d)/i.test(t) && t.length < 80) {
                  price = t.replace(/\s+/g, ' ');
                  const cleanedDigits = price.replace(/\s+/g, '').match(/\d+/);
                  if (cleanedDigits) salaryNum = parseInt(cleanedDigits[0], 10);
                  break;
                }
              }

              // Работодатель
              const employerEl = card.querySelector(
                '[data-qa="vacancy-serp__vacancy-employer-text"], [data-qa="vacancy-serp__vacancy-employer"]'
              );
              const employer = employerEl?.textContent?.trim() || 'Компания';

              // Город / локация
              const cityEl = card.querySelector(
                '[data-qa="vacancy-serp__vacancy-address"], [data-qa="vacancy-serp__vacancy_address"]'
              );
              const city = cityEl?.textContent?.trim() || 'Удаленно';

              // Стек, опыт и требования
              const tagEls = card.querySelectorAll(
                '[data-qa^="vacancy-label"], [data-qa^="vacancy-serp__vacancy-work-experience"], [data-qa="vacancy-serp__vacancy_snippet_requirement"]'
              );
              const tags = Array.from(tagEls)
                .map((el) => el.textContent?.trim())
                .filter(Boolean)
                .join(' ');

              const desc = tags || 'Требования и условия указаны в описании вакансии на HH.ru';

              return { id, title, desc, price, salaryNum, link, employer, city };
            });
          }
        );

        const valid = vacanciesOnPage.filter((v): v is RawHhVacancy => v !== null);
        allRawVacancies.push(...valid);
        console.log(`[HH Playwright] ✅ Страница ${pageNum + 1}: извлечено ${valid.length} вакансий`);

        if (options.onProgress) {
          options.onProgress({
            page: pageNum + 1,
            totalPages: maxPages,
            found: allRawVacancies.length,
          });
        }

        // Пауза 1.5 сек между страницами для оптимизации сбора без антиспам-детекта
        if (pageNum < maxPages - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (pageErr: any) {
        console.warn(`[HH Playwright] Ошибка при сборе страницы ${pageNum + 1}: ${pageErr.message}`);
        break;
      }
    }
  } finally {
    await close();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[HH Playwright] 🏁 Сбор завершён за ${durationSec}с. Всего сырых вакансий: ${allRawVacancies.length}`);

  // Дедупликация по ID вакансии
  const seenIds = new Set<string>();
  const uniqueVacancies: RawHhVacancy[] = [];
  for (const item of allRawVacancies) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueVacancies.push(item);
    }
  }

  const passedVacancies: Vacancy[] = [];

  for (const item of uniqueVacancies) {
    const evaluation = evaluateVacancyByFilters(item.title, item.desc, rules);
    const { hook, pitch } = generateCoverLetter(item.title, evaluation.matchedKeywords);

    const isRemote =
      item.city.toLowerCase().includes('удален') ||
      item.desc.toLowerCase().includes('удален') ||
      baseUrl.includes('schedule=remote');

    const vacancy: Vacancy = {
      id: `hh-${item.id}`,
      orderId: String(item.id),
      source: 'hh',
      title: item.title,
      description: `${item.desc}\nУсловия: ${isRemote ? 'Удаленно' : item.city}`,
      price: item.price,
      salaryNum: item.salaryNum,
      link: item.link,
      employer: item.employer,
      city: item.city,
      isRemote,
      score: evaluation.score,
      matchPercentage: evaluation.matchPercentage,
      matchedKeywords: evaluation.matchedKeywords,
      filterVerdict: evaluation.verdict,
      hook,
      pitch,
      tags:
        evaluation.matchedKeywords.length > 0
          ? evaluation.matchedKeywords
          : ['TypeScript', 'React', 'Node.js'],
      status: 'new',
      outcome: 'pending',
      publishedAt: new Date().toISOString(),
    };

    if (evaluation.isExcluded) {
      appEventBus.emit(EventType.VACANCY_FILTER_REJECTED, {
        vacancy,
        reason: evaluation.stopWordFound,
      });
    } else if (evaluation.score >= rules.minScore) {
      passedVacancies.push(vacancy);
      appEventBus.emit(EventType.VACANCY_FILTER_PASSED, {
        vacancy,
        score: evaluation.score,
      });
    }
  }

  console.log(
    `[HH Playwright] 🎯 Результат фильтрации: одобрено ${passedVacancies.length} из ${uniqueVacancies.length} (мин. скор: ${rules.minScore})`
  );

  return passedVacancies;
}

function buildHhPageUrl(baseUrl: string, pageNum: number): string {
  try {
    const url = new URL(baseUrl);
    if (pageNum > 0) {
      url.searchParams.set('page', String(pageNum));
    } else {
      url.searchParams.delete('page');
    }
    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return pageNum > 0 ? `${baseUrl}${separator}page=${pageNum}` : baseUrl;
  }
}
