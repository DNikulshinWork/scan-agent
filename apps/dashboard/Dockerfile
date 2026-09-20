FROM node:20-alpine AS builder
RUN npm install -g pnpm turbo

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @scan-agent/dashboard run build

FROM nginx:alpine
COPY --from=builder /app/apps/dashboard/out /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
