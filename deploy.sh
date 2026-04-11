#!/bin/bash

# VapeKHV Deployment Script
# Использование: ./deploy.sh

set -e  # Остановить выполнение при ошибке

echo "🚀 Starting VapeKHV deployment..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Конфигурация (измени под свой сервер)
FRONTEND_DEST="/var/www/vapekhv"
PM2_APP_NAME="vapekhv-backend"

# Шаг 1: Pull последних изменений
echo -e "${BLUE}📥 Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git pull successful${NC}"
else
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
fi
echo ""

# Шаг 2: Установка зависимостей
echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi
echo ""

# Шаг 3: Сборка проекта
echo -e "${BLUE}🏗️  Step 3: Building project...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Шаг 4: Деплой frontend
echo -e "${BLUE}📁 Step 4: Deploying frontend to ${FRONTEND_DEST}...${NC}"
if [ -d "frontend/dist" ]; then
    sudo cp -r frontend/dist/* $FRONTEND_DEST/
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend deployed${NC}"
    else
        echo -e "${RED}❌ Frontend deployment failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ frontend/dist directory not found${NC}"
    exit 1
fi
echo ""

# Шаг 5: Перезагрузка Nginx
echo -e "${BLUE}🔄 Step 5: Reloading Nginx...${NC}"
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx reload failed${NC}"
    exit 1
fi
echo ""

# Шаг 6: Проверка и восстановление изображений товаров
if [ -n "$UPLOADS_DIR" ]; then
    echo -e "${BLUE}🖼️  Step 6: Repairing missing product images...${NC}"
    npm run repair:missing-images --workspace=backend
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Product images checked${NC}"
    else
        echo -e "${RED}❌ Product image repair failed${NC}"
        exit 1
    fi
    echo ""
fi

# Шаг 7: Перезапуск backend через PM2
echo -e "${BLUE}🔄 Step 7: Restarting backend (PM2)...${NC}"
pm2 restart $PM2_APP_NAME
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend restarted${NC}"
else
    echo -e "${RED}❌ Backend restart failed${NC}"
    exit 1
fi
echo ""

# Показать статус PM2
echo -e "${BLUE}📊 PM2 Status:${NC}"
pm2 status $PM2_APP_NAME
echo ""

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🎉 VapeKHV has been successfully deployed!${NC}"
echo ""
echo "Frontend: https://vapekhv.ru"
echo "Backend: Running on PM2 ($PM2_APP_NAME)"
