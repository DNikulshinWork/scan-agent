import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { prisma, ensureDatabaseSchema } from '@scan-agent/database';
import { appEventBus, EventType } from '@scan-agent/events';
import { runHhScannerJob, ScannerOptions } from '@scan-agent/scanner';
import { KeywordScoringRule, Vacancy } from '@scan-agent/shared-types';
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  broadcastPushNotification,
  sendTestPushNotification,
} from './pushService.js';

dotenv.config();

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development',
});

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://dnikulshinwork.github.io',
      'https://dnikulshin.github.io',
    ];

await fastify.register(cors, {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    // Разрешаем запросы от любых доверенных источников, локалхоста и браузерных клиентов
    cb(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept', 'Origin', 'X-Requested-With'],
});

// ==========================================
// Защита эндпоинтов по API-ключу (x-api-key / Bearer token / query)
// ==========================================
const rawSecret = process.env.API_SECRET_KEY || '';
const API_SECRET_KEY = rawSecret.trim().replace(/^["']|["']$/g, '');

if (API_SECRET_KEY) {
  fastify.log.info('[Security] Защита API активна (API_SECRET_KEY установлен в переменных окружения).');
} else {
  fastify.log.warn('[Security] API_SECRET_KEY не установлен. API работает в открытом режиме.');
}

fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
  // Разрешаем CORS preflight (OPTIONS) без авторизации
  if (req.method === 'OPTIONS') return;

  // Если API_SECRET_KEY не задан в переменных окружения — пропускаем запросы без блокировки
  if (!API_SECRET_KEY) return;

  const url = req.url.split('?')[0];

  // Публичные эндпоинты (мониторинг, проверка здоровья, публичный VAPID-ключ и внешний cron со своим CRON_SECRET)
  if (
    url === '/health' ||
    url === '/api/health' ||
    url === '/api/diagnostics/secrets' ||
    url === '/api/scan/cron' ||
    url === '/api/push/vapid-public-key'
  ) {
    return;
  }

  // Проверяем x-api-key, Authorization: Bearer <key> или ?apiKey=... / ?token=...
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const bearerToken = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const query = req.query as Record<string, string> | undefined;
  const queryToken = query?.apiKey || query?.token || query?.key;

  const rawProvidedKey = (typeof apiKeyHeader === 'string' ? apiKeyHeader.trim() : '') || bearerToken || (typeof queryToken === 'string' ? queryToken.trim() : '');
  const providedKey = rawProvidedKey.replace(/^["']|["']$/g, '').trim();

  if (!providedKey || (providedKey !== API_SECRET_KEY && providedKey !== rawSecret.trim())) {
    fastify.log.warn(`[Security] 401 Unauthorized к ${url}. Header: ${Boolean(apiKeyHeader)}, Bearer: ${Boolean(bearerToken)}, Query: ${Boolean(queryToken)}`);
    return reply.status(401).send({
      ok: false,
      error: 'Unauthorized: Invalid or missing API Key. Provide valid x-api-key header or Authorization: Bearer <token>',
    });
  }
});

const defaultRules: KeywordScoringRule = {
  coreStack: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Fastify', 'NestJS', 'PostgreSQL', 'Prisma'],
  relatedStack: ['Docker', 'Redis', 'WebSocket', 'Tailwind', 'Python', 'FastAPI'],
  niceToHave: ['Zustand', 'Vitest', 'TanStack'],
  hardExclude: ['1c', '1с', 'bitrix', 'битрикс', 'wordpress', 'tilda', 'тильда', 'тестировщик', 'qa'],
  minScore: 3,
};

let activeRules: KeywordScoringRule = { ...defaultRules };

async function loadRulesFromDb(): Promise<KeywordScoringRule> {
  try {
    const config = await prisma.scoringRuleConfig.findUnique({ where: { id: 'default' } });
    if (config) {
      activeRules = {
        coreStack: config.coreStack ? config.coreStack.split(',').map((s: string) => s.trim()).filter(Boolean) : defaultRules.coreStack,
        relatedStack: config.relatedStack ? config.relatedStack.split(',').map((s: string) => s.trim()).filter(Boolean) : defaultRules.relatedStack,
        niceToHave: config.niceToHave ? config.niceToHave.split(',').map((s: string) => s.trim()).filter(Boolean) : defaultRules.niceToHave,
        hardExclude: config.hardExclude ? config.hardExclude.split(',').map((s: string) => s.trim()).filter(Boolean) : defaultRules.hardExclude,
        minScore: typeof config.minScore === 'number' ? config.minScore : defaultRules.minScore,
      };
      fastify.log.info('[ScoringRules] Правила скоринга успешно загружены из базы PostgreSQL');
    } else {
      await prisma.scoringRuleConfig.create({
        data: {
          id: 'default',
          coreStack: defaultRules.coreStack.join(','),
          relatedStack: defaultRules.relatedStack.join(','),
          niceToHave: defaultRules.niceToHave.join(','),
          hardExclude: defaultRules.hardExclude.join(','),
          minScore: defaultRules.minScore,
        },
      });
      fastify.log.info('[ScoringRules] Создана начальная запись правил скоринга в PostgreSQL');
    }
  } catch (err) {
    fastify.log.warn(err, '[ScoringRules] Не удалось прочитать правила из базы данных, используются дефолтные');
  }
  return activeRules;
}

// ==========================================
// Состояние сканера и блокировка параллельных запусков
// ==========================================
let isScanning = false;
let autoScanEnabled = process.env.AUTO_SCAN_ENABLED !== 'false';
let autoScanIntervalMinutes = Number(process.env.AUTO_SCAN_INTERVAL_MINUTES || 30);
let lastScanAt: string | null = null;
let lastScanDurationMs = 0;
let lastFoundCount = 0;
let lastSavedCount = 0;
let lastError: string | null = null;
let nextScheduledRun: string | null = null;
let timerId: NodeJS.Timeout | null = null;

// Слушатель событий для сохранения вакансий в PostgreSQL (Neon) и отправки Web Push
appEventBus.on(EventType.VACANCY_FILTER_PASSED, async ({ vacancy }: { vacancy: Vacancy }) => {
  try {
    const saved = await prisma.order.upsert({
      where: { orderId_source: { orderId: vacancy.orderId, source: 'hh' } },
      update: {
        score: vacancy.score,
        matchPercent: vacancy.matchPercentage,
        verdict: vacancy.filterVerdict,
        hook: vacancy.hook,
        pitch: vacancy.pitch,
        tags: vacancy.tags.join(','),
      },
      create: {
        orderId: vacancy.orderId,
        source: 'hh',
        title: vacancy.title,
        description: vacancy.description,
        price: vacancy.price,
        salaryNum: vacancy.salaryNum,
        link: vacancy.link,
        score: vacancy.score,
        matchPercent: vacancy.matchPercentage,
        verdict: vacancy.filterVerdict,
        hook: vacancy.hook,
        pitch: vacancy.pitch,
        employer: vacancy.employer,
        city: vacancy.city,
        isRemote: vacancy.isRemote,
        tags: vacancy.tags.join(','),
        status: 'new',
        publishedAt: new Date(vacancy.publishedAt),
      },
    });

    // Отправляем настоящий Web Push всем подписчикам, если вакансия набрала высокий балл
    if (vacancy.score >= (activeRules.minScore || 6)) {
      broadcastPushNotification({
        title: `🎯 HH.ru: ${vacancy.title.slice(0, 45)}...`,
        body: `${vacancy.employer || 'Компания'} · ${vacancy.price || 'З/п не указана'} · Скоринг: ${vacancy.score}/10`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: {
          url: vacancy.link || './',
          orderId: vacancy.orderId,
          id: saved.id,
        },
      }).catch((err) => fastify.log.warn(err, '[WebPush] Ошибка бродкаста уведомления'));
    }
  } catch (err) {
    fastify.log.error(err, `Ошибка сохранения вакансии hh-${vacancy.orderId} в БД`);
  }
});

/**
 * Единая функция выполнения сбора вакансий через Playwright с мьютексом
 */
async function executeScanJob(
  source: 'manual' | 'cron-job' | 'internal-cron' | 'api',
  options?: Partial<ScannerOptions>
): Promise<{ ok: boolean; scanned: number; durationMs: number; error?: string }> {
  if (isScanning) {
    fastify.log.warn(`[Scanner] Запуск пропущен (${source}): сканирование уже выполняется.`);
    return { ok: false, scanned: 0, durationMs: 0, error: 'Scan already in progress' };
  }

  isScanning = true;
  lastError = null;
  const startTime = Date.now();
  fastify.log.info(`[Scanner] 🚀 Старт сбора вакансий HH (источник: ${source})...`);

  try {
    // Гарантируем наличие таблиц в PostgreSQL перед сохранением
    await ensureDatabaseSchema().catch(() => {});

    const vacancies = await runHhScannerJob({
      rules: activeRules,
      maxPages: options?.maxPages ?? Number(process.env.HH_MAX_PAGES || 2),
      searchUrl: options?.searchUrl,
    });

    // Напрямую гарантированно сохраняем все найденные вакансии в PostgreSQL
    let savedInDb = 0;
    for (const v of vacancies) {
      try {
        await prisma.order.upsert({
          where: { orderId_source: { orderId: v.orderId, source: 'hh' } },
          update: {
            score: v.score,
            matchPercent: v.matchPercentage,
            verdict: v.filterVerdict,
            hook: v.hook,
            pitch: v.pitch,
            tags: v.tags.join(','),
          },
          create: {
            orderId: v.orderId,
            source: 'hh',
            title: v.title,
            description: v.description,
            price: v.price,
            salaryNum: v.salaryNum,
            link: v.link,
            score: v.score,
            matchPercent: v.matchPercentage,
            verdict: v.filterVerdict,
            hook: v.hook,
            pitch: v.pitch,
            employer: v.employer,
            city: v.city,
            isRemote: v.isRemote,
            tags: v.tags.join(','),
            status: 'new',
            publishedAt: new Date(v.publishedAt),
          },
        });
        savedInDb++;
      } catch (saveErr) {
        fastify.log.error(saveErr, `Ошибка прямой записи вакансии hh-${v.orderId} в БД`);
      }
    }

    const durationMs = Date.now() - startTime;
    lastScanAt = new Date().toISOString();
    lastScanDurationMs = durationMs;
    lastFoundCount = vacancies.length;
    lastSavedCount = savedInDb;

    fastify.log.info(
      `[Scanner] ✅ Сбор завершен успешно за ${(durationMs / 1000).toFixed(1)}с. Найдено: ${vacancies.length}, сохранено в Neon: ${savedInDb}`
    );

    return { ok: true, scanned: vacancies.length, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    lastScanDurationMs = durationMs;
    lastError = err.message || 'Unknown error during scan';
    fastify.log.error(err, `[Scanner] ❌ Ошибка выполнения сбора вакансий: ${lastError}`);
    return { ok: false, scanned: 0, durationMs, error: lastError || undefined };
  } finally {
    isScanning = false;
    calculateNextRun();
  }
}

function calculateNextRun() {
  if (autoScanEnabled && autoScanIntervalMinutes > 0) {
    nextScheduledRun = new Date(Date.now() + autoScanIntervalMinutes * 60 * 1000).toISOString();
  } else {
    nextScheduledRun = null;
  }
}

function initInternalCron() {
  if (timerId) clearInterval(timerId);

  if (autoScanEnabled && autoScanIntervalMinutes > 0) {
    calculateNextRun();
    const intervalMs = autoScanIntervalMinutes * 60 * 1000;
    timerId = setInterval(() => {
      if (autoScanEnabled && !isScanning) {
        executeScanJob('internal-cron');
      }
    }, intervalMs);
    timerId.unref();
    fastify.log.info(
      `[Cron] Фоновый автосбор активен: каждые ${autoScanIntervalMinutes} мин. Следующий запуск: ${nextScheduledRun}`
    );
  } else {
    nextScheduledRun = null;
    fastify.log.info('[Cron] Фоновый автосбор отключен.');
  }
}

// ==========================================
// Health check: проверка жизни API + реальный запрос в Neon PostgreSQL
// Вызывается cron-job.org каждые 14 минут по URL https://scan-agent-api.onrender.com/health
// ==========================================
const handleHealthCheck = async (req: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now();
  try {
    // Выполняем РЕАЛЬНЫЙ запрос в базу данных для гарантированного пробуждения Neon
    await prisma.$queryRaw`SELECT 1`;
    const ordersCount = await prisma.order.count().catch(() => 0);
    const dbLatencyMs = Date.now() - startTime;

    return reply.status(200).send({
      status: 'ok',
      api: 'healthy',
      database: 'connected',
      dbLatencyMs,
      totalOrders: ordersCount,
      uptimeSeconds: Math.floor(process.uptime()),
      scanner: {
        isScanning,
        autoScanEnabled,
        autoScanIntervalMinutes,
        lastScanAt,
        lastScanDurationMs,
        lastFoundCount,
        nextScheduledRun,
        lastError,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    fastify.log.error(err, 'Health check failed to query database');
    return reply.status(503).send({
      status: 'degraded',
      api: 'healthy',
      database: 'error',
      error: err.message || 'Database connection failure',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
};

// Регистрируем ОБА пути: /health (для cron-job.org) и /api/health (для дашборда)
fastify.get('/health', handleHealthCheck);
fastify.get('/api/health', handleHealthCheck);

// ==========================================
// Аудит секретов, ключей и конфигурации Render
// ==========================================
function maskSecretValue(val: string | undefined): { isSet: boolean; preview: string; length: number } {
  if (!val) return { isSet: false, preview: 'не задан', length: 0 };
  const clean = val.trim().replace(/^["']|["']$/g, '');
  if (!clean) return { isSet: false, preview: 'не задан', length: 0 };
  if (clean.length <= 8) {
    return { isSet: true, preview: '••••••••', length: clean.length };
  }
  const preview = `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
  return { isSet: true, preview, length: clean.length };
}

fastify.get('/api/diagnostics/secrets', async (req: FastifyRequest) => {
  const startTime = Date.now();
  let dbStatus = 'checking';
  let dbLatencyMs = 0;
  let totalVacancies = 0;
  let dbHost = 'unknown';

  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl) {
      try {
        const parsed = new URL(dbUrl.replace(/^postgresql:\/\//i, 'http://'));
        dbHost = parsed.hostname;
      } catch {
        dbHost = 'neon.tech';
      }
    }
    await prisma.$queryRaw`SELECT 1`;
    try {
      totalVacancies = await prisma.order.count();
    } catch (countErr: any) {
      if (countErr.message?.includes('does not exist') || countErr.code === 'P2021') {
        await ensureDatabaseSchema().catch(() => {});
        totalVacancies = await prisma.order.count().catch(() => 0);
      }
    }
    dbLatencyMs = Date.now() - startTime;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error: ' + (err.message || 'connection failed');
  }

  // Caller auth check
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const bearerToken = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const query = req.query as Record<string, string> | undefined;
  const queryToken = query?.apiKey || query?.token || query?.key;
  const rawProvidedKey = (typeof apiKeyHeader === 'string' ? apiKeyHeader.trim() : '') || bearerToken || (typeof queryToken === 'string' ? queryToken.trim() : '');
  const providedKey = rawProvidedKey.replace(/^["']|["']$/g, '').trim();

  const apiSecretSet = Boolean(API_SECRET_KEY);
  const clientKeyMatches = apiSecretSet ? (providedKey === API_SECRET_KEY || providedKey === rawSecret.trim()) : true;

  const cronSecret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, '');
  const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, '');
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, '');
  const vapidSubject = process.env.VAPID_SUBJECT?.trim().replace(/^["']|["']$/g, '');
  const hhSearchUrl = process.env.HH_SEARCH_URL?.trim().replace(/^["']|["']$/g, '');

  const secretsAudit = [
    {
      key: 'API_SECRET_KEY',
      category: 'Security & Auth',
      description: 'Мастер-ключ авторизации доступа к защищенным API эндпоинтам бэкенда',
      required: true,
      configured: apiSecretSet,
      ...maskSecretValue(API_SECRET_KEY),
      clientMatches: clientKeyMatches,
      status: !apiSecretSet ? 'warning' : clientKeyMatches ? 'ok' : 'mismatch',
      message: !apiSecretSet
        ? 'Не задан на сервере: защита API отключена'
        : clientKeyMatches
        ? 'Установлен и подтвержден (совпадает с ключом в вашем браузере)'
        : 'Установлен на сервере, но не совпадает с ключом в браузере (вызывает 401)',
    },
    {
      key: 'DATABASE_URL',
      category: 'Database',
      description: 'Строка подключения к пулу базы данных PostgreSQL (Neon)',
      required: true,
      configured: Boolean(process.env.DATABASE_URL),
      ...maskSecretValue(process.env.DATABASE_URL),
      status: dbStatus === 'connected' ? 'ok' : 'error',
      details: {
        host: dbHost,
        latencyMs: dbLatencyMs,
        totalOrders: totalVacancies,
      },
      message:
        dbStatus === 'connected'
          ? `Neon PostgreSQL подключена успешно (${dbLatencyMs}мс, ${totalVacancies} вакансий в БД)`
          : `Ошибка соединения: ${dbStatus}`,
    },
    {
      key: 'CRON_SECRET',
      category: 'Scheduler',
      description: 'Секретный токен для запуска фонового сбора через cron-job.org (/api/scan/cron)',
      required: true,
      configured: Boolean(cronSecret),
      ...maskSecretValue(cronSecret),
      status: cronSecret ? 'ok' : 'warning',
      message: cronSecret
        ? 'Токен установлен (cron-задачи защищены от несанкционированного вызова)'
        : 'Не задан: внешний планировщик cron-job.org не сможет запустить парсинг',
    },
    {
      key: 'VAPID_PUBLIC_KEY',
      category: 'Web Push',
      description: 'Публичный ключ ECDSA P-256 для регистрации Push-подписок в браузере',
      required: false,
      configured: Boolean(vapidPublic),
      ...maskSecretValue(vapidPublic),
      status: vapidPublic && vapidPublic.length >= 65 ? 'ok' : vapidPublic ? 'warning' : 'neutral',
      message: vapidPublic
        ? `Публичный ключ активен (${vapidPublic.length} симв.)`
        : 'Не задан (браузерные Web Push уведомления отключены)',
    },
    {
      key: 'VAPID_PRIVATE_KEY',
      category: 'Web Push',
      description: 'Приватный ключ подписи Web Push уведомлений (RFC 8291 / RFC 8292)',
      required: false,
      configured: Boolean(vapidPrivate),
      ...maskSecretValue(vapidPrivate),
      status: vapidPrivate && vapidPrivate.length >= 32 ? 'ok' : vapidPrivate ? 'warning' : 'neutral',
      message: vapidPrivate
        ? `Приватный ключ активен (${vapidPrivate.length} симв.)`
        : 'Не задан (сервер не сможет подписывать push-уведомления)',
    },
    {
      key: 'VAPID_SUBJECT',
      category: 'Web Push',
      description: 'Контактный почтовый адрес администратора (mailto:...) для push-сервисов Google/Apple',
      required: false,
      configured: Boolean(vapidSubject),
      preview: vapidSubject || 'не задан',
      length: vapidSubject ? vapidSubject.length : 0,
      isSet: Boolean(vapidSubject),
      status: vapidSubject && vapidSubject.includes('@') ? 'ok' : vapidSubject ? 'warning' : 'neutral',
      message: vapidSubject ? `Контакт указан: ${vapidSubject}` : 'Не задан',
    },
    {
      key: 'HH_SEARCH_URL',
      category: 'Scanner & Filter',
      description: 'Ссылка с кастомными фильтрами поиска вакансий на hh.ru (удаленка, стек, исключения)',
      required: false,
      configured: Boolean(hhSearchUrl),
      preview: hhSearchUrl ? `${hhSearchUrl.slice(0, 24)}...` : 'по умолчанию (Fullstack/TS/React/Node)',
      length: hhSearchUrl ? hhSearchUrl.length : 0,
      isSet: Boolean(hhSearchUrl),
      status: 'ok',
      message: hhSearchUrl
        ? `Кастомный поисковый URL активен (${hhSearchUrl.length} симв.)`
        : 'Используется встроенный оптимизированный поисковый фильтр',
    },
    {
      key: 'NODE_ENV',
      category: 'Environment',
      description: 'Режим запуска Node.js среды',
      required: true,
      configured: Boolean(process.env.NODE_ENV),
      preview: process.env.NODE_ENV || 'production',
      length: (process.env.NODE_ENV || 'production').length,
      isSet: true,
      status: 'ok',
      message: `Текущий режим: ${process.env.NODE_ENV || 'production'}`,
    },
    {
      key: 'PORT',
      category: 'Environment',
      description: 'Сетевой порт сервиса (назначается платформой Render)',
      required: true,
      configured: Boolean(process.env.PORT),
      preview: process.env.PORT || '10000',
      length: (process.env.PORT || '10000').length,
      isSet: true,
      status: 'ok',
      message: `Сервер прослушивает 0.0.0.0:${process.env.PORT || '10000'}`,
    },
  ];

  const total = secretsAudit.length;
  const validCount = secretsAudit.filter((s) => s.status === 'ok').length;
  const warningCount = secretsAudit.filter((s) => s.status === 'warning' || s.status === 'mismatch').length;
  const errorCount = secretsAudit.filter((s) => s.status === 'error').length;

  return {
    ok: errorCount === 0 && (!apiSecretSet || clientKeyMatches),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    server: {
      port: process.env.PORT || '10000',
      nodeEnv: process.env.NODE_ENV || 'production',
    },
    clientSession: {
      keyProvided: Boolean(providedKey),
      keyMatchesServer: clientKeyMatches,
      providedKeyPreview: providedKey ? `${providedKey.slice(0, 4)}••••${providedKey.slice(-4)}` : 'не передан',
    },
    stats: {
      total,
      valid: validCount,
      warnings: warningCount,
      errors: errorCount,
      allReady: errorCount === 0 && warningCount === 0,
    },
    items: secretsAudit,
  };
});

// ==========================================
// Управление сбором вакансий и статусом
// ==========================================

// Текущий статус работы сканера
fastify.get('/api/scan/status', async () => {
  return {
    isScanning,
    autoScanEnabled,
    autoScanIntervalMinutes,
    lastScanAt,
    lastScanDurationMs,
    lastFoundCount,
    lastSavedCount,
    lastError,
    nextScheduledRun,
    timestamp: new Date().toISOString(),
  };
});

// Ручной запуск сбора вакансий (для дашборда)
fastify.post('/api/scan', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req.body as any) || {};
  const sync = body.sync === true;

  if (isScanning) {
    return reply.status(409).send({
      ok: false,
      isScanning: true,
      message: 'Сканирование уже запущено другим процессом. Пожалуйста, подождите.',
    });
  }

  if (sync) {
    // Синхронный режим: ждем завершения и возвращаем результат
    const result = await executeScanJob('manual', { maxPages: body.maxPages });
    return reply.send({
      ...result,
      message: result.ok ? `Собрано ${result.scanned} вакансий` : result.error,
    });
  }

  // Асинхронный фоновый запуск
  setImmediate(() => {
    executeScanJob('manual', { maxPages: body.maxPages });
  });

  return reply.send({
    ok: true,
    isScanning: true,
    message: 'Сбор вакансий запущен в фоновом режиме через Playwright',
  });
});

// Эндпоинт для запуска через внешний cron-job (GET или POST)
const handleCronTrigger = async (req: FastifyRequest, reply: FastifyReply) => {
  const query = req.query as { token?: string; pages?: string };
  const secret = process.env.CRON_SECRET;

  // Опциональная проверка секретного токена (CRON_SECRET или API_SECRET_KEY)
  const allowedSecret = secret || API_SECRET_KEY;
  if (allowedSecret) {
    const authHeader = req.headers['authorization'] || req.headers['x-cron-secret'] || req.headers['x-api-key'];
    const token = query.token || (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '');
    if (token !== secret && token !== API_SECRET_KEY) {
      return reply.status(401).send({ ok: false, error: 'Unauthorized: Invalid cron secret' });
    }
  }

  if (isScanning) {
    return reply.status(200).send({
      ok: false,
      isScanning: true,
      message: 'Scan already in progress, skipped this tick',
    });
  }

  // Запуск сбора
  const pages = query.pages ? Number(query.pages) : undefined;
  const result = await executeScanJob('cron-job', { maxPages: pages });
  return reply.send(result);
};

fastify.get('/api/scan/cron', handleCronTrigger);
fastify.post('/api/scan/cron', handleCronTrigger);
fastify.get('/api/cron', handleCronTrigger);

// Переключение состояния автосбора (вкл/выкл)
fastify.post('/api/scan/toggle', async (req: FastifyRequest) => {
  const body = (req.body as any) || {};
  if (typeof body.enabled === 'boolean') {
    autoScanEnabled = body.enabled;
  }
  if (typeof body.intervalMinutes === 'number' && body.intervalMinutes > 0) {
    autoScanIntervalMinutes = body.intervalMinutes;
  }

  initInternalCron();

  return {
    ok: true,
    autoScanEnabled,
    autoScanIntervalMinutes,
    nextScheduledRun,
  };
});

// ==========================================
// Получение и редактирование вакансий
// ==========================================
fastify.get('/api/vacancies', async (req: any, reply: FastifyReply) => {
  const { status, minScore, limit } = req.query as {
    status?: string;
    minScore?: string;
    limit?: string;
  };

  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (minScore) where.score = { gte: Number(minScore) };

  const take = limit ? Math.min(200, Number(limit)) : 100;

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return orders.map((o: any) => ({
      ...o,
      tags: o.tags ? o.tags.split(',') : [],
      matchPercentage: o.matchPercent,
      filterVerdict: o.verdict,
    }));
  } catch (err: any) {
    // Если таблицы еще не существовали, создаем их на лету и возвращаем пустой массив
    if (err.message?.includes('does not exist') || err.code === 'P2021') {
      try {
        await ensureDatabaseSchema();
        return [];
      } catch (schemaErr) {
        fastify.log.error(schemaErr, 'Failed to auto-create schema on P2021');
      }
    }
    fastify.log.error(err, 'Error in GET /api/vacancies');
    return reply.status(500).send({ statusCode: 500, error: 'Database query failed', message: err.message });
  }
});

fastify.patch('/api/vacancies/:id', async (req: any) => {
  const { id } = req.params as { id: string };
  const { status, outcome } = req.body as { status?: string; outcome?: string };

  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(outcome ? { outcome } : {}),
      ...(status === 'applied' ? { appliedAt: new Date() } : {}),
    },
  });

  appEventBus.emit(EventType.VACANCY_STATUS_CHANGED, { vacancyId: id, newStatus: status });
  return updated;
});

// ==========================================
// Правила скоринга (Scoring Rules) в базе Neon
// ==========================================
fastify.get('/api/scoring-rules', async () => {
  return activeRules;
});

const handleScoringRulesUpdate = async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req.body as Partial<KeywordScoringRule>) || {};

  const updatedRules: KeywordScoringRule = {
    coreStack: Array.isArray(body.coreStack) ? body.coreStack : activeRules.coreStack,
    relatedStack: Array.isArray(body.relatedStack) ? body.relatedStack : activeRules.relatedStack,
    niceToHave: Array.isArray(body.niceToHave) ? body.niceToHave : activeRules.niceToHave,
    hardExclude: Array.isArray(body.hardExclude) ? body.hardExclude : activeRules.hardExclude,
    minScore: typeof body.minScore === 'number' ? body.minScore : activeRules.minScore,
  };

  try {
    await prisma.scoringRuleConfig.upsert({
      where: { id: 'default' },
      update: {
        coreStack: updatedRules.coreStack.join(','),
        relatedStack: updatedRules.relatedStack.join(','),
        niceToHave: updatedRules.niceToHave.join(','),
        hardExclude: updatedRules.hardExclude.join(','),
        minScore: updatedRules.minScore,
        updatedAt: new Date(),
      },
      create: {
        id: 'default',
        coreStack: updatedRules.coreStack.join(','),
        relatedStack: updatedRules.relatedStack.join(','),
        niceToHave: updatedRules.niceToHave.join(','),
        hardExclude: updatedRules.hardExclude.join(','),
        minScore: updatedRules.minScore,
      },
    });

    activeRules = updatedRules;
    fastify.log.info('[ScoringRules] Правила скоринга обновлены и сохранены в PostgreSQL');
    return reply.send({ ok: true, rules: activeRules, message: 'Правила скоринга сохранены в базе Neon' });
  } catch (err: any) {
    fastify.log.error(err, 'Ошибка сохранения правил скоринга в БД');
    return reply.status(500).send({ ok: false, error: err.message || 'Failed to save scoring rules' });
  }
};

fastify.route({
  method: ['PUT', 'POST'],
  url: '/api/scoring-rules',
  handler: handleScoringRulesUpdate,
});

// ==========================================
// Настоящий Web Push (VAPID / RFC 8291)
// ==========================================
// Получение публичного VAPID ключа клиентом
fastify.get('/api/push/vapid-public-key', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const publicKey = getVapidPublicKey();
    return { publicKey };
  } catch (err: any) {
    return reply.status(503).send({ ok: false, error: 'VAPID keys not configured' });
  }
});

// Сохранение Push-подписки браузера
fastify.post('/api/push/subscribe', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req.body as any) || {};
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return reply.status(400).send({ ok: false, error: 'Invalid PushSubscription payload' });
  }

  try {
    const userAgent = (req.headers['user-agent'] as string) || '';
    await savePushSubscription({
      endpoint: body.endpoint,
      keys: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      userAgent,
    });
    return reply.send({ ok: true, message: 'Web Push подписка сохранена в базе Neon' });
  } catch (err: any) {
    fastify.log.error(err, 'Ошибка сохранения Push-подписки');
    return reply.status(500).send({ ok: false, error: err.message });
  }
});

// Отписка браузера от Web Push
fastify.post('/api/push/unsubscribe', async (req: FastifyRequest) => {
  const body = (req.body as any) || {};
  if (body.endpoint) {
    await removePushSubscription(body.endpoint);
  }
  return { ok: true };
});

// Тестовая отправка Web Push уведомления с сервера
fastify.post('/api/push/send-test', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req.body as any) || {};
  try {
    const result = await sendTestPushNotification(body.endpoint);
    return reply.send({ ok: true, ...result, message: 'Тестовое Web Push уведомление отправлено' });
  } catch (err: any) {
    fastify.log.error(err, 'Ошибка тестовой отправки Web Push');
    return reply.status(500).send({ ok: false, error: err.message });
  }
});

// Количество активных Web Push подписчиков
fastify.get('/api/push/subscriptions/count', async () => {
  const count = await prisma.pushSubscription.count().catch(() => 0);
  return { count };
});

const start = async () => {
  const port = Number(process.env.PORT) || 10000;
  
  // Автоматически создаем таблицы в Neon PostgreSQL, если база еще не инициализирована
  try {
    await ensureDatabaseSchema();
    fastify.log.info('[Database] Структура таблиц PostgreSQL (Neon) проверена/инициализирована успешно');
  } catch (err: any) {
    fastify.log.error(err, '[Database] Предупреждение: ошибка при автосоздании таблиц Neon PostgreSQL');
  }

  await fastify.listen({ port, host: '0.0.0.0' });
  await loadRulesFromDb();
  initInternalCron();
  fastify.log.info(`[Fastify API] Сервер запущен на 0.0.0.0:${port}`);
};

start();
