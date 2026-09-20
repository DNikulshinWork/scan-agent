import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { prisma } from '@scan-agent/database';
import { appEventBus, EventType } from '@scan-agent/events';
import { runHhScannerJob } from '@scan-agent/scanner';
import { KeywordScoringRule, Vacancy } from '@scan-agent/shared-types';

dotenv.config();

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development',
});

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'https://dnikulshinwork.github.io'];

await fastify.register(cors, {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
});

const defaultRules: KeywordScoringRule = {
  coreStack: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Fastify', 'NestJS', 'PostgreSQL', 'Prisma'],
  relatedStack: ['Docker', 'Redis', 'WebSocket', 'Tailwind', 'Python', 'FastAPI'],
  niceToHave: ['Zustand', 'Vitest', 'TanStack'],
  hardExclude: ['1c', '1с', 'bitrix', 'битрикс', 'wordpress', 'tilda', 'тильда', 'тестировщик', 'qa'],
  minScore: 6,
};

appEventBus.on(EventType.VACANCY_FILTER_PASSED, async ({ vacancy }: { vacancy: Vacancy }) => {
  try {
    await prisma.order.upsert({
      where: { orderId_source: { orderId: vacancy.orderId, source: 'hh' } },
      update: { score: vacancy.score, matchPercent: vacancy.matchPercentage },
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
    fastify.log.error(err, 'Failed to upsert order into Neon via Prisma 7');
  }
});

fastify.get('/api/health', async () => ({ status: 'ok', uptime: process.uptime() }));

fastify.get('/api/vacancies', async (req) => {
  const { status, minScore } = req.query as { status?: string; minScore?: string };
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (minScore) where.score = { gte: Number(minScore) };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
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

fastify.post('/api/scan', async () => {
  setImmediate(async () => {
    try {
      await runHhScannerJob(defaultRules);
    } catch (e) {
      fastify.log.error(e, 'Scanner job failed');
    }
  });
  return { ok: true, message: 'Scan job triggered' };
});

const start = async () => {
  const port = Number(process.env.PORT) || 10000;
  await fastify.listen({ port, host: '0.0.0.0' });
};

start();
