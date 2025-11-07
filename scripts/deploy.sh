#!/bin/bash

# Скрипт для деплоя VapeKHV Telegram Web App
# Автор: VapeKHV Team
# Дата: 17.10.2025

set -e  # Остановиться при ошибке

echo "🚀 Начинаем деплой VapeKHV..."

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Директории
PROJECT_DIR="/root/shop"
WEB_DIR="/var/www/vapekhv"
BACKUP_DIR="/var/www/vapekhv_backup_$(date +%Y%m%d_%H%M%S)"

cd $PROJECT_DIR

echo -e "${BLUE}📦 Шаг 1: Установка зависимостей...${NC}"
npm install

echo -e "${BLUE}🔨 Шаг 2: Сборка frontend...${NC}"
cd frontend
npm run build
cd ..

cd backend
npm run build
cd ..

echo -e "${BLUE}💾 Шаг 3: Создание резервной копии...${NC}"
if [ -d "$WEB_DIR" ]; then
    sudo cp -r $WEB_DIR $BACKUP_DIR
    echo -e "${GREEN}✅ Резервная копия создана: $BACKUP_DIR${NC}"
fi

echo -e "${BLUE}📂 Шаг 4: Копирование файлов...${NC}"
sudo mkdir -p $WEB_DIR
sudo cp -r $PROJECT_DIR/frontend/dist/* $WEB_DIR/
sudo chown -R www-data:www-data $WEB_DIR

echo -e "${BLUE}🔄 Шаг 5: Перезапуск сервисов...${NC}"
# Проверка конфигурации nginx
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx перезагружен${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации nginx!${NC}"
    exit 1
fi

# Перезапуск backend через PM2 (если используется)
if command -v pm2 &> /dev/null; then
    pm2 restart vapekhv-backend 2>/dev/null || echo "Backend не запущен через PM2"
fi

echo -e "${BLUE}🧹 Шаг 6: Очистка старых бэкапов (оставляем последние 5)...${NC}"
ls -dt /var/www/vapekhv_backup_* 2>/dev/null | tail -n +6 | xargs sudo rm -rf 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${BLUE}🌐 Сайт доступен по адресу: https://vapekhv.live${NC}"
echo -e "${BLUE}📊 Backend API: https://vapekhv.live/api${NC}"
echo ""
echo "Полезные команды:"
echo "  - Логи nginx: sudo tail -f /var/log/nginx/vapekhv_error.log"
echo "  - Логи backend: pm2 logs vapekhv-backend"
echo "  - Статус: pm2 status"
echo ""

