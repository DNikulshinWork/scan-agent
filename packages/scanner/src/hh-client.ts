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
    minScore: 3,
  };

  // По умолчанию ищем вакансии для удаленной работы по релевантному стеку (Fullstack/Frontend/Node/React/TypeScript), отсортированные по дате
  const defaultSearchUrl =
    process.env.HH_SEARCH_URL ||
    'https://hh.ru/search/vacancy?text=TypeScript+OR+React+OR+Node.js+OR+Fullstack&schedule=remote&order_by=publication_time';

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

        // Даем секунду на первичное монтирование скриптов
        await page.waitForTimeout(1000);

        // Проверяем наличие карточек вакансий или любых ссылок на вакансии
        const hasCards = await page
          .waitForSelector('a[href*="/vacancy/"], [data-qa="vacancy-serp__vacancy"], [data-qa="serp-item__title"]', {
            timeout: 10_000,
          })
          .then(() => true)
          .catch(() => false);

        if (!hasCards) {
          const pageTitle = await page.title().catch(() => '');
          console.log(`[HH Playwright] На странице ${pageNum + 1} вакансий не обнаружено (title: "${pageTitle}").`);
          break;
        }

        const vacanciesOnPage = await page.evaluate((): (RawHhVacancy | null)[] => {
          // Ищем все ссылки на вакансии на странице
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/vacancy/"]'));
          const seenIds = new Set<string>();
          const results: (RawHhVacancy | null)[] = [];

          for (const linkEl of links) {
            const rawHref = linkEl.href || '';
            const link = rawHref.split('?')[0];
            const idMatch = link.match(/\/vacancy\/(\d+)/);
            const id = idMatch?.[1];
            if (!id || seenIds.has(id)) continue;

            // Находим родительский контейнер карточки
            const card = (linkEl.closest('[data-qa="vacancy-serp__vacancy"]') ||
              linkEl.closest('div[data-qa*="vacancy"]') ||
              linkEl.closest('div[class*="vacancy-card"]') ||
              linkEl.closest('div[class*="serp-item"]') ||
              linkEl.parentElement?.parentElement?.parentElement) as HTMLElement | null;

            // Заголовок вакансии
            const title =
              linkEl.textContent?.trim() ||
              card?.querySelector('[data-qa*="title"]')?.textContent?.trim() ||
              '';

            // Пропускаем служебные ссылки без внятного заголовка
            if (!title || title.length < 3 || /^(отклик|показать|подробнее|вакансия)/i.test(title)) {
              continue;
            }

            seenIds.add(id);

            // Зарплата
            let price = 'Договорная';
            let salaryNum: number | null = null;
            if (card) {
              const allSpans = Array.from(card.querySelectorAll('span'));
              for (const span of allSpans) {
                const text = span.textContent?.trim() || '';
                if (/([\d\s]+[₽$€]|от\s*\d|до\s*\d)/i.test(text) && text.length < 80) {
                  price = text.replace(/\s+/g, ' ');
                  const digits = price.replace(/\s+/g, '').match(/\d+/);
                  if (digits) salaryNum = parseInt(digits[0], 10);
                  break;
                }
              }
            }

            // Работодатель
            const employer =
              card?.querySelector('[data-qa*="employer"]')?.textContent?.trim() ||
              card?.querySelector('a[href*="/employer/"]')?.textContent?.trim() ||
              'Компания';

            // Город
            const city =
              card?.querySelector('[data-qa*="address"]')?.textContent?.trim() ||
              card?.querySelector('[data-qa*="city"]')?.textContent?.trim() ||
              'Удаленно';

            // Требования и стек
            const tagEls = card ? Array.from(card.querySelectorAll('[data-qa*="label"], [data-qa*="requirement"], [data-qa*="snippet"], [data-qa*="experience"]')) : [];
            const tags = tagEls.map((e) => e.textContent?.trim()).filter(Boolean).join(' ');
            const desc = tags || card?.textContent?.slice(0, 300)?.trim() || 'Описание вакансии на HH.ru';

            results.push({ id, title, desc, price, salaryNum, link, employer, city });
          }

          return results;
        });

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
    } else if (evaluation.score >= (rules.minScore ?? 3) || uniqueVacancies.length <= 15) {
      // Если вакансия прошла стоп-фильтры и набрала минимальный скор (или выдача компактная) — сохраняем
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
