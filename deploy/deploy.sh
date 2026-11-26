#!/usr/bin/env bash
# ============================================================
#  Обновление проекта на VPS.
#  Использование:  sudo bash deploy/deploy.sh
#  (запускать из папки проекта или указать APP_DIR)
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pixora}"
SERVICE="${SERVICE:-pixora-api}"

cd "$APP_DIR"

echo "==> Текущая версия"
git log -1 --oneline || true

echo "==> Забираем изменения из git"
git pull --ff-only

echo "==> Устанавливаем зависимости"
npm install --no-audit --no-fund

echo "==> Собираем фронтенд"
npm run build

echo "==> Перезапускаем сервис"
sudo systemctl restart "$SERVICE"
sleep 1
sudo systemctl --no-pager --lines=15 status "$SERVICE" || true

echo "==> Проверка API"
curl -fsS "http://127.0.0.1:4000/api/health" && echo

echo "Готово."
