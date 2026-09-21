FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9 turbo

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @scan-agent/database run prisma:generate
RUN pnpm --filter @scan-agent/shared-types run build
RUN pnpm --filter @scan-agent/events run build
RUN pnpm --filter @scan-agent/database run build
RUN pnpm --filter @scan-agent/scanner run build
RUN pnpm --filter @scan-agent/api run build

# Установка Chromium и системных зависимостей для Playwright
RUN pnpm exec playwright install --with-deps chromium

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

# Необходимые runtime библиотеки для работы headless Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

# Копируем кэш браузера Playwright и собранное приложение
COPY --from=base /root/.cache/ms-playwright /root/.cache/ms-playwright
COPY --from=base /app ./

EXPOSE 10000
CMD ["pnpm", "--filter", "@scan-agent/api", "start"]
