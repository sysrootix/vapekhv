#!/bin/bash

# Скрипт для инициализации базы данных PostgreSQL
# Использование: ./scripts/init-db.sh

set -e

echo "🚀 Инициализация базы данных VapeKHV..."

# Проверка что PostgreSQL запущен
if ! systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL не запущен. Запускаем..."
    sudo systemctl start postgresql
fi

# Проверка что файл .env существует
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Файл backend/.env не найден. Копируем из .env.example..."
    cp backend/.env.example backend/.env
    echo "✅ Файл .env создан. Пожалуйста, настройте DATABASE_URL и TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Читаем DATABASE_URL из .env
source backend/.env

# Извлекаем имя базы данных
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo "📊 База данных: $DB_NAME"
echo "👤 Пользователь: $DB_USER"

# Создаем пользователя и базу данных
sudo -u postgres psql << EOF
-- Создаем пользователя если не существует
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
   END IF;
END
\$\$;

-- Создаем базу данных если не существует
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Даем права
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

echo "✅ База данных создана"

# Запускаем миграции Prisma
echo "🔄 Запуск миграций Prisma..."
cd backend
npx prisma generate
npx prisma migrate deploy

echo "✅ Миграции применены успешно"
echo "🎉 База данных готова к использованию!"
echo ""
echo "Следующие шаги:"
echo "1. Настройте TELEGRAM_BOT_TOKEN в backend/.env"
echo "2. Запустите: npm run dev"

