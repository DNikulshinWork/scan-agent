import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { prisma } from '@scan-agent/database';
import { appEventBus, EventType } from '@scan-agent/events';
import { runHhScannerJob, ScannerOptions } from '@scan-agent/scanner';
import { KeywordScoringRule, Vacancy } from '@scan-agent/shared-types';

dotenv.config();

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development',
});

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://dnikulshinwork.github.io',
      'https://dnikulshin.github.io',
    ];

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Разрешаем запросы без Origin (например, от curl, cron-job.org или SSR)
    if (!origin) return cb(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.github.io') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return cb(null, true);
    }
    return cb(null, true); // Допускаем для надежности кросс-доменного PWA
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
});

const defaultRules: KeywordScoringRule = {
  coreStack: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Fastify', 'NestJS', 'PostgreSQL', 'Prisma'],
  relatedStack: ['Docker', 'Redis', 'WebSocket', 'Tailwind', 'Python', 'FastAPI'],
  niceToHave: ['Zustand', 'Vitest', 'TanStack'],
  hardExclude: ['1c', '1с', 'bitrix', 'битрикс', 'wordpress', 'tilda', 'тильда', 'тестировщик', 'qa'],
  minScore: 6,
};

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

// Слушатель событий для сохранения вакансий в PostgreSQL (Neon)
appEventBus.on(EventType.VACANCY_FILTER_PASSED, async ({ vacancy }: { vacancy: Vacancy }) => {
  try {
    await prisma.order.upsert({
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
    const vacancies = await runHhScannerJob({
      rules: defaultRules,
      maxPages: options?.maxPages ?? Number(process.env.HH_MAX_PAGES || 2),
      searchUrl: options?.searchUrl,
    });

    const durationMs = Date.now() - startTime;
    lastScanAt = new Date().toISOString();
    lastScanDurationMs = durationMs;
    lastFoundCount = vacancies.length;
    lastSavedCount = vacancies.length;

    fastify.log.info(
      `[Scanner] ✅ Сбор завершен успешно за ${(durationMs / 1000).toFixed(1)}с. Найдено вакансий: ${vacancies.length}`
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

  // Опциональная проверка секретного токена
  if (secret) {
    const authHeader = req.headers['authorization'] || req.headers['x-cron-secret'];
    const token = query.token || (typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '');
    if (token !== secret) {
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
fastify.get('/api/vacancies', async (req) => {
  const { status, minScore, limit } = req.query as {
    status?: string;
    minScore?: string;
    limit?: string;
  };

  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (minScore) where.score = { gte: Number(minScore) };

  const take = limit ? Math.min(200, Number(limit)) : 100;

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
});

fastify.patch('/api/vacancies/:id', async (req) => {
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

const start = async () => {
  const port = Number(process.env.PORT) || 10000;
  await fastify.listen({ port, host: '0.0.0.0' });
  initInternalCron();
  fastify.log.info(`[Fastify API] Сервер запущен на 0.0.0.0:${port}`);
};

start();
