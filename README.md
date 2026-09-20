# ScanAgent HH Dashboard & Microservices Monorepo

> Мониторинг вакансий с HH.ru на детерминированных фильтрах стека резюме (Dmitry Nikulshin).
> Архитектура: **pnpm workspaces + Turborepo + Fastify + Next.js 16 + Prisma 7 (Neon) + Event-Driven (ED) + GHCR CD**.

## Стек технологий
- **Monorepo**: pnpm workspaces, Turborepo
- **Backend**: Fastify v5, Event-Driven Bus (eventemitter2), Prisma 7, @prisma/adapter-pg, pg Pool
- **Database**: Neon Serverless PostgreSQL
- **Frontend**: Next.js 16, React 19, Tailwind CSS, Lucide Icons (Static Export on GitHub Pages)
- **CI/CD**: GitHub Actions, GHCR (GitHub Container Registry), GitHub Pages
- **Containers**: Multi-stage Dockerfile, Docker Compose (Desktop & Production)

## Локальный запуск
```bash
# 1. Установка зависимостей
pnpm install

# 2. Генерация Prisma 7 Client
pnpm db:generate

# 3. Запуск сервисов в dev-режиме
pnpm dev
```

## Запуск в Docker Desktop
```bash
docker compose up --build -d
```
- Dashboard: http://localhost:3000
- API Healthcheck: http://localhost:10000/api/health
