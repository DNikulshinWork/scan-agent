import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';

// Подключаем плагин stealth для обхода антифрод-защиты Cloudflare / HH.ru
chromium.use(stealth());

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export interface CreateBrowserOptions {
  userAgent?: string;
  headless?: boolean;
}

/**
 * Создание инстанса Playwright с stealth-плагином и оптимизацией ресурсов
 */
export async function createBrowser(options?: CreateBrowserOptions): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless: options?.headless ?? true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      options?.userAgent ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  // Шим для tsx/esbuild keepNames: транспайлер оборачивает именованные функции
  // в __name(fn, "name"). При page.evaluate(fn) функция сериализуется и шлётся
  // в браузер — но __name там не определён, что вызывает ReferenceError.
  await context.addInitScript(() => {
    // @ts-ignore
    globalThis.__name = globalThis.__name || ((fn: any) => fn);
  });

  const page = await context.newPage();

  // ОПТИМИЗАЦИЯ СКОРОСТИ И ПАМЯТИ:
  // Блокируем тяжёлые медиа, шрифты и картинки, так как для парсинга HTML они не нужны.
  // Это ускоряет загрузку страниц в 3-4 раза и экономит оперативную память в контейнере Render.
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      return route.abort();
    }
    const url = route.request().url().toLowerCase();
    if (
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.gif') ||
      url.endsWith('.webp') ||
      url.endsWith('.svg') ||
      url.endsWith('.woff') ||
      url.endsWith('.woff2')
    ) {
      return route.abort();
    }
    return route.continue();
  });

  return {
    browser,
    context,
    page,
    close: async () => {
      try {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
      } catch {
        // Safe fallback on shutdown
      }
    },
  };
}
