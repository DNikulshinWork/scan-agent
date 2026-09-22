#!/bin/bash
set -e

# Render Deploy Hook for service
RENDER_HOOK="${RENDER_DEPLOY_HOOK_URL:-}"

if [ -z "$RENDER_HOOK" ]; then
  echo "❌ Ошибка: Переменная RENDER_DEPLOY_HOOK_URL не установлена."
  echo "Использование: RENDER_DEPLOY_HOOK_URL='https://api.render.com/deploy/srv-...' ./scripts/trigger-render-deploy.sh"
  exit 1
fi

echo "🚀 Отправка запроса на Deploy Hook Render..."
echo "👉 Сервис: srv-danv04oae00c73a5vv10"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$RENDER_HOOK")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
  echo "✅ Деплой на Render успешно запущен! (HTTP $HTTP_STATUS)"
  echo "📦 Ответ: $BODY"
else
  echo "❌ Ошибка вызова Deploy Hook (HTTP $HTTP_STATUS):"
  echo "$BODY"
  exit 1
fi
