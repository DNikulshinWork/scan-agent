import React, { useState } from 'react';
import {
  Server,
  Database,
  Globe,
  CheckCircle2,
  Copy,
  Check,
  Code,
  Layers,
  ArrowRight,
  Shield,
  Zap,
  Cpu,
  Workflow,
  Sparkles,
} from 'lucide-react';

export const ArchitecturePlanView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedBackend, setSelectedBackend] = useState<'fastify' | 'nestjs'>('fastify');

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeSnippets = {
    pnpmWorkspace: `# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'`,

    turboJson: `// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "out/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}`,

    eventBusSnippet: `// packages/events/src/index.ts (Event-Driven Architecture)
import { EventEmitter2 } from 'eventemitter2';
import { Vacancy, VacancyStatus } from '@scan-agent/shared-types';

export enum EventType {
  VACANCY_DISCOVERED = 'vacancy.discovered',
  VACANCY_FILTER_PASSED = 'vacancy.filter.passed',
  VACANCY_FILTER_REJECTED = 'vacancy.filter.rejected',
  VACANCY_STATUS_CHANGED = 'vacancy.status.changed',
  TELEGRAM_ALERT_TRIGGERED = 'notification.telegram.alert',
}

export interface VacancyDiscoveredPayload {
  rawId: string;
  source: 'hh';
  title: string;
  description: string;
  salaryRaw: string;
  url: string;
  employer: string;
  city: string;
  isRemote: boolean;
}

export interface VacancyFilterResultPayload {
  vacancy: Vacancy;
  passed: boolean;
  score: number;
  matchedKeywords: string[];
  stopWordFound?: string;
}

export interface VacancyStatusChangedPayload {
  vacancyId: string;
  oldStatus: VacancyStatus;
  newStatus: VacancyStatus;
  updatedAt: string;
}

// Singleton Type-safe Event Bus
export const appEventBus = new EventEmitter2({
  wildcard: true,
  delimiter: '.',
  maxListeners: 50,
  verboseMemoryLeakSuppression: true,
});`,

    fastifyBackend: `// apps/api/src/server.ts (Fastify + Event-Driven + Prisma Neon)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@scan-agent/database';
import { appEventBus, EventType } from '@scan-agent/events';
import { scanHhVacancies } from '@scan-agent/scanner';

const fastify = Fastify({
  logger: true,
});

// 1. CORS для GitHub Pages
await fastify.register(cors, {
  origin: [
    'https://dnikulshin.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
});

// 2. Event Listeners (Event-Driven Pattern)
appEventBus.on(EventType.VACANCY_FILTER_PASSED, async (payload) => {
  fastify.log.info({ id: payload.vacancy.id }, 'Event: Vacancy passed filter, saving to Neon...');
  await prisma.order.upsert({
    where: { orderId_source: { orderId: payload.vacancy.orderId, source: 'hh' } },
    update: { score: payload.vacancy.score, status: 'new' },
    create: {
      orderId: payload.vacancy.orderId,
      source: 'hh',
      title: payload.vacancy.title,
      description: payload.vacancy.description,
      price: payload.vacancy.price,
      link: payload.vacancy.link,
      score: payload.vacancy.score,
      hook: payload.vacancy.hook,
      pitch: payload.vacancy.pitch,
      employer: payload.vacancy.employer,
      city: payload.vacancy.city,
      tags: payload.vacancy.tags.join(','),
      status: 'new',
    },
  });
});

// 3. REST API Routes для Dashboard
fastify.get('/api/health', async () => ({ status: 'ok', uptime: process.uptime() }));

fastify.get('/api/vacancies', async (req) => {
  const { status, minScore } = req.query as { status?: string; minScore?: string };
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (minScore) where.score = { gte: Number(minScore) };

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
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

// Триггер запуска сканирования HH.ru
fastify.post('/api/scan', async () => {
  // Запуск парсера в фоне (парсер публикует события VACANCY_DISCOVERED)
  setImmediate(() => scanHhVacancies());
  return { ok: true, message: 'Scan job triggered' };
});

const start = async () => {
  const PORT = Number(process.env.PORT) || 10000;
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
};
start();`,

    nestjsBackend: `// apps/api/src/vacancies/vacancies.controller.ts (NestJS Module)
import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventType } from '@scan-agent/events';

@Controller('api/vacancies')
export class VacanciesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Get()
  async getVacancies(@Query('status') status?: string, @Query('minScore') minScore?: string) {
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (minScore) where.score = { gte: Number(minScore) };

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; outcome?: string }
  ) {
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.outcome ? { outcome: body.outcome } : {}),
        ...(body.status === 'applied' ? { appliedAt: new Date() } : {}),
      },
    });

    this.eventEmitter.emit(EventType.VACANCY_STATUS_CHANGED, { vacancyId: id, status: body.status });
    return updated;
  }
}`,

    nextConfig: `// apps/dashboard/next.config.ts (Next.js 16 + Static Export for GitHub Pages)
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export', // Next.js 16 Static HTML/CSS/JS export для GitHub Pages
  basePath: isProd && repoName ? repoName : '',
  assetPrefix: isProd && repoName ? \`\${repoName}/\` : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Next.js 16 Turbopack оптимизации
  turbopack: {},
};

export default nextConfig;`,

    prismaConfig: `// packages/database/prisma.config.ts (Prisma 7 TypeScript Config)
import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});`,

    prismaClientAdapter: `// packages/database/src/index.ts (Prisma 7 + @prisma/adapter-pg for Neon)
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

// pg Pool с настройками под Neon Serverless Connection Pooling
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
export * from '@prisma/client';`,

    prismaSchema: `// packages/database/prisma/schema.prisma (Prisma 7 Schema)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // В Prisma 7 DATABASE_URL задается в prisma.config.ts и драйвер-адаптере @prisma/adapter-pg
}

model Order {
  id           String    @id @default(uuid()) @db.Uuid
  orderId      String    @map("order_id")
  source       String    @default("hh")
  title        String    @default("")
  description  String    @default("")
  price        String    @default("")
  salaryNum    Int?      @map("salary_num")
  link         String    @default("")
  score        Int       @default(0)
  matchPercent Int       @default(0) @map("match_percent")
  verdict      String    @default("")
  hook         String    @default("")
  pitch        String    @default("")
  tags         String    @default("")
  employer     String?
  city         String?
  isRemote     Boolean   @default(false) @map("is_remote")
  status       String    @default("new")     // new | applied | skipped
  outcome      String    @default("pending") // pending | won | lost
  publishedAt  DateTime? @map("published_at") @db.Timestamptz(6)
  appliedAt    DateTime? @map("applied_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([orderId, source])
  @@index([status])
  @@index([score(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("orders")
}`,

    dockerCompose: `# docker-compose.yml (Local testing with Docker Desktop)
version: '3.8'

services:
  # Local PostgreSQL instance (compatible with Neon)
  postgres:
    image: postgres:16-alpine
    container_name: scan-agent-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: scanagent
      POSTGRES_PASSWORD: scanagent_local_password
      POSTGRES_DB: scanagent_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scanagent -d scanagent_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Fastify / Node API service
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: scan-agent-api
    restart: unless-stopped
    ports:
      - "10000:10000"
    environment:
      PORT: 10000
      NODE_ENV: development
      DATABASE_URL: "postgresql://scanagent:scanagent_local_password@postgres:5432/scanagent_db?schema=public"
      CORS_ORIGIN: "http://localhost:3000,http://localhost:8080"
    depends_on:
      postgres:
        condition: service_healthy

  # Dashboard static container (tests GitHub Pages export locally via Nginx)
  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    container_name: scan-agent-dashboard
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  postgres_data:`,

    apiDockerfile: `# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install and build packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @scan-agent/database run prisma:generate
RUN pnpm --filter @scan-agent/api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

RUN npm install -g pnpm
COPY --from=base /app ./

EXPOSE 10000
CMD ["pnpm", "--filter", "@scan-agent/api", "start"]`,

    ghPagesWorkflow: `# .github/workflows/deploy-gh-pages.yml
name: Deploy Dashboard to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/dashboard/**'
      - 'packages/**'
      - '.github/workflows/deploy-gh-pages.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Next.js Static Export
        env:
          NEXT_PUBLIC_BASE_PATH: '/scan-agent'
          NEXT_PUBLIC_API_URL: 'https://scan-agent-api.onrender.com'
        run: pnpm --filter @scan-agent/dashboard run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './apps/dashboard/out'

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`,

    ghcrWorkflow: `# .github/workflows/deploy-ghcr.yml
name: Build and Push Docker Image to GHCR

on:
  push:
    branches: [main]
    tags: ['v*.*.*']
    paths:
      - 'apps/api/**'
      - 'packages/**'
      - 'Dockerfile'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
      - 'turbo.json'
      - '.github/workflows/deploy-ghcr.yml'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}/api

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up QEMU (Multi-platform support)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry (GHCR)
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable=\${{ github.ref == 'refs/heads/main' }}
            type=sha,format=short,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max`,

    prodCompose: `# docker-compose.prod.yml (Универсальный запуск на любом сервере/VPS/Render/Coolify)
version: '3.8'

services:
  api:
    image: ghcr.io/dnikulshin/scan-agent/api:latest
    container_name: scan-agent-api
    restart: always
    ports:
      - "10000:10000"
    environment:
      NODE_ENV: production
      PORT: 10000
      # Neon PostgreSQL (Connection string с пулингом)
      DATABASE_URL: "postgresql://username:password@ep-cool-pooler.eu-central-1.aws.neon.tech/scanagent_db?sslmode=require"
      CORS_ORIGIN: "https://dnikulshin.github.io,http://localhost:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:10000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3`,
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Plan Introduction */}
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-400" />
          <span>Архитектура: pnpm workspaces + Turborepo + ED (Event-Driven)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Чистая организация монорепозитория микросервисов: детерминированные фильтры, шина событий, Next.js на GitHub Pages, бэкенд на Render и база Neon.
        </p>
      </div>

      {/* Backend Comparison Matrix: Fastify vs NestJS */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-rose-400" />
              <span>Выбор бэкенда для Render: Fastify vs NestJS</span>
            </h3>
            <p className="text-xs text-gray-400">
              Сравнение с учетом ограничений бесплатного тарифа Render (сон после 15 мин простоя, 512 МБ RAM)
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800 self-start sm:self-auto">
            <button
              onClick={() => setSelectedBackend('fastify')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedBackend === 'fastify'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Fastify (Рекомендуется)
            </button>
            <button
              onClick={() => setSelectedBackend('nestjs')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedBackend === 'nestjs'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🏰 NestJS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Fastify Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedBackend === 'fastify'
                ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                : 'bg-gray-950/60 border-gray-800/80'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <span className="font-bold text-sm text-white">Fastify</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Холодный старт: ~300ms
              </span>
            </div>
            <ul className="text-xs text-gray-300 space-y-2 pt-3">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Потребление RAM:</strong> 25–35 МБ (в 2.5 раза меньше лимита Render).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Пробуждение:</strong> Сервис просыпается мгновенно при первом запросе с GitHub Pages.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Опыт Дмитрия:</strong> Уже проверен в high-load проекте <code>corporate-transport</code>.</span>
              </li>
            </ul>
          </div>

          {/* NestJS Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedBackend === 'nestjs'
                ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                : 'bg-gray-950/60 border-gray-800/80'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <span className="font-bold text-sm text-white">NestJS</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Холодный старт: ~1.5–2.5s
              </span>
            </div>
            <ul className="text-xs text-gray-300 space-y-2 pt-3">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Архитектура:</strong> Строгий DI, модули, контроллеры и декораторы.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Event-Driven:</strong> Нативный пакет <code>@nestjs/event-emitter</code> из коробки.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">!</span>
                <span><strong>Потребление RAM:</strong> 70–90 МБ (приемлемо, но требует больше времени на прогрев).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ED Monorepo Structure */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Workflow className="w-4 h-4 text-rose-400" />
          <span>Структура монорепозитория (pnpm workspaces + Turborepo)</span>
        </h3>

        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800/80 font-mono text-xs text-gray-300 leading-relaxed overflow-x-auto">
          <pre>{`scan-agent/
├── apps/
│   ├── dashboard/             # Next.js 15 App Router (output: 'export' -> GitHub Pages)
│   └── api/                   # ${selectedBackend === 'fastify' ? 'Fastify' : 'NestJS'} REST API + Cron Worker (Render Web Service)
├── packages/
│   ├── database/              # Prisma Client + Neon PostgreSQL схема
│   ├── events/                # Event-Driven Bus (типизированные события: Discovered, Filtered, StatusChanged)
│   ├── scanner/               # HH.ru парсер + детерминированный движок фильтрации (HardExclude/Stack)
│   └── shared-types/          # Единые типы DTO, вакансий и контрактов
├── pnpm-workspace.yaml
├── turbo.json
└── package.json`}</pre>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Code className="w-4 h-4 text-rose-400" />
          <span>Конфигурации и код реализации</span>
        </h3>

        {/* 1. pnpm-workspace.yaml & turbo.json */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-300">pnpm-workspace.yaml</span>
              <button
                onClick={() => copyCode('pnpm', codeSnippets.pnpmWorkspace)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
              >
                {copiedKey === 'pnpm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'pnpm' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-gray-300">{codeSnippets.pnpmWorkspace}</pre>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-300">turbo.json</span>
              <button
                onClick={() => copyCode('turbo', codeSnippets.turboJson)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
              >
                {copiedKey === 'turbo' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'turbo' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-gray-300 max-h-48 overflow-y-auto">{codeSnippets.turboJson}</pre>
          </div>
        </div>

        {/* 2. Event-Driven Bus */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-300">packages/events/src/index.ts (Event Bus)</span>
            <button
              onClick={() => copyCode('eventBus', codeSnippets.eventBusSnippet)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'eventBus' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'eventBus' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-64">
            {codeSnippets.eventBusSnippet}
          </pre>
        </div>

        {/* 3. Selected Backend Code */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-rose-300">
              apps/api/src/server.ts ({selectedBackend === 'fastify' ? 'Fastify Server' : 'NestJS Controller'})
            </span>
            <button
              onClick={() =>
                copyCode(
                  'backend',
                  selectedBackend === 'fastify'
                    ? codeSnippets.fastifyBackend
                    : codeSnippets.nestjsBackend
                )
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'backend' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-80">
            {selectedBackend === 'fastify'
              ? codeSnippets.fastifyBackend
              : codeSnippets.nestjsBackend}
          </pre>
        </div>

        {/* 4. Prisma 7 Configuration and Adapter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300">packages/database/prisma.config.ts (Prisma 7)</span>
              <button
                onClick={() => copyCode('prismaCfg', codeSnippets.prismaConfig)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
              >
                {copiedKey === 'prismaCfg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'prismaCfg' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-gray-300 max-h-52 overflow-y-auto">{codeSnippets.prismaConfig}</pre>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300">packages/database/src/index.ts (@prisma/adapter-pg)</span>
              <button
                onClick={() => copyCode('prismaClient', codeSnippets.prismaClientAdapter)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
              >
                {copiedKey === 'prismaClient' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'prismaClient' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-gray-300 max-h-52 overflow-y-auto">{codeSnippets.prismaClientAdapter}</pre>
          </div>
        </div>

        {/* 5. Neon PostgreSQL Schema */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-300">packages/database/prisma/schema.prisma (Prisma 7 Schema)</span>
            <button
              onClick={() => copyCode('prisma', codeSnippets.prismaSchema)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'prisma' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'prisma' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-60">
            {codeSnippets.prismaSchema}
          </pre>
        </div>

        {/* 5. Docker Desktop Configuration */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300 flex items-center gap-2">
              <span>docker-compose.yml (Тестирование в Docker Desktop)</span>
            </span>
            <button
              onClick={() => copyCode('docker', codeSnippets.dockerCompose)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'docker' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-72">
            {codeSnippets.dockerCompose}
          </pre>
        </div>

        {/* 6. GitHub Pages CI/CD Action */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-300 flex items-center gap-2">
              <span>.github/workflows/deploy-gh-pages.yml (Автодеплой Dashboard на GitHub Pages)</span>
            </span>
            <button
              onClick={() => copyCode('ghPages', codeSnippets.ghPagesWorkflow)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'ghPages' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'ghPages' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-72">
            {codeSnippets.ghPagesWorkflow}
          </pre>
        </div>

        {/* 7. GitHub Container Registry (GHCR) Build & Push Action */}
        <div className="bg-gray-950 border border-purple-900/40 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <span>.github/workflows/deploy-ghcr.yml (Сборка CD Docker образа в GHCR)</span>
            </span>
            <button
              onClick={() => copyCode('ghcr', codeSnippets.ghcrWorkflow)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'ghcr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'ghcr' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-72">
            {codeSnippets.ghcrWorkflow}
          </pre>
        </div>

        {/* 8. Production Docker Compose (Деплой на любой сервер из GHCR) */}
        <div className="bg-gray-950 border border-amber-900/40 rounded-2xl overflow-hidden">
          <div className="bg-gray-900/90 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-amber-300 flex items-center gap-2">
              <span>docker-compose.prod.yml (Запуск на любом VPS / Render / Coolify через GHCR)</span>
            </span>
            <button
              onClick={() => copyCode('prodCompose', codeSnippets.prodCompose)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200"
            >
              {copiedKey === 'prodCompose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'prodCompose' ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-60">
            {codeSnippets.prodCompose}
          </pre>
        </div>
      </div>
    </div>
  );
};
