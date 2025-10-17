#!/bin/bash

# Полный скрипт настройки проекта
# Использование: ./scripts/setup.sh

set -e

echo "🚀 Настройка проекта VapeKHV Telegram Web App"
echo "=============================================="
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 20+ и повторите."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Требуется Node.js 20+, у вас установлен: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ npm $(npm -v)"

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL не найден. Установите PostgreSQL 14+ и повторите."
    echo "   Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ PostgreSQL установлен"

# Установка зависимостей
echo ""
echo "📦 Установка зависимостей..."
npm install

# Создание .env файлов
echo ""
echo "⚙️  Настройка конфигурации..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Создан backend/.env"
    
    # Генерация JWT секрета
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Замена JWT_SECRET в .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your_super_secret_jwt_key_change_this_in_production/$JWT_SECRET/" backend/.env
    else
        # Linux
        sed -i "s/your_super_secret_jwt_key_change_this_in_production/$JWT_SECRET/" backend/.env
    fi
    
    echo "✅ JWT секрет сгенерирован"
else
    echo "⚠️  backend/.env уже существует, пропускаем"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Создан frontend/.env"
else
    echo "⚠️  frontend/.env уже существует, пропускаем"
fi

echo ""
echo "=============================================="
echo "✅ Базовая настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. 🤖 Создайте Telegram бота через @BotFather"
echo "   - Отправьте /newbot"
echo "   - Получите токен"
echo "   - Добавьте токен в backend/.env (TELEGRAM_BOT_TOKEN)"
echo ""
echo "2. 🗄️  Настройте PostgreSQL"
echo "   - Обновите DATABASE_URL в backend/.env"
echo "   - Или запустите: ./scripts/init-db.sh"
echo ""
echo "3. 🌐 Настройте Web App в @BotFather"
echo "   - Отправьте /newapp"
echo "   - Укажите URL: https://vapekhv.live"
echo ""
echo "4. ▶️  Запустите проект"
echo "   - Development: npm run dev"
echo "   - Production: npm run build && npm start"
echo ""
echo "📖 Подробные инструкции: README.md и SETUP.md"
echo "=============================================="

