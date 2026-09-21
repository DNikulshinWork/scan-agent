#!/bin/bash
set -e

# Render Deploy Hook for service srv-danv04oae00c73a5vv10
RENDER_HOOK="${RENDER_DEPLOY_HOOK_URL:-https://api.render.com/deploy/srv-danv04oae00c73a5vv10?key=lKtY2NRDKUc}"

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
