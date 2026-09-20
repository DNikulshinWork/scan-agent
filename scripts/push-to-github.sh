#!/bin/bash
set -e

REPO_URL="${REPO_SLUG:-github.com/DNikulshinWork/scan-agent.git}"
BRANCH="${1:-main}"
TOKEN="${GITHUB_TOKEN:-$2}"

if [ -z "$TOKEN" ]; then
  echo "❌ Ошибка: GITHUB_TOKEN не найден в переменных окружения."
  echo "👉 Укажите GITHUB_TOKEN в Settings -> Secrets или запустите скрипт с токеном:"
  echo "   ./scripts/push-to-github.sh $BRANCH <your_github_token>"
  exit 1
fi

echo "🚀 Настройка авторизации и отправка в https://$REPO_URL (ветка: $BRANCH)..."
cd "$(dirname "$0")/.."

# Гарантированная очистка токена при любом завершении скрипта (успех или ошибка)
cleanup() {
  git remote set-url origin "https://${REPO_URL}" 2>/dev/null || true
  echo "🔒 Токен безопасно очищен из конфигурации git."
}
trap cleanup EXIT INT TERM

# Безопасный push с токеном
git remote set-url origin "https://${TOKEN}@${REPO_URL}"

# Отправка изменений в ветку
git push origin "HEAD:${BRANCH}"
echo "✅ Успешно отправлено в ветку ${BRANCH}!"

