FROM node:20-alpine AS base
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

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

RUN npm install -g pnpm@9
COPY --from=base /app ./

EXPOSE 10000
CMD ["pnpm", "--filter", "@scan-agent/api", "start"]
