# 📝 Инструкции по обновлению переменных окружения

## ⚠️ Важно

Файлы `.env` не включены в репозиторий по соображениям безопасности. Вам нужно обновить их вручную на сервере.

## 🔧 Backend (.env)

Откройте файл `/root/shop/backend/.env` и обновите следующие переменные:

```env
# Старые значения (закомментируйте или удалите):
# DOMAIN=vapekhv.ru
# FRONTEND_URL=https://vapekhv.ru
# WEBAPP_URL=https://vapekhv.ru

# Новые значения:
DOMAIN=vapekhv.ru
FRONTEND_URL=https://vapekhv.ru
WEBAPP_URL=https://vapekhv.ru
```

### Команда для быстрого обновления:
```bash
cd /root/shop/backend
sed -i 's/vapekhv\.top/vapekhv.ru/g' .env
sed -i 's|https://vapekhv.ru|https://vapekhv.ru|g' .env
```

## 🎨 Frontend (.env)

Создайте или обновите файл `/root/shop/frontend/.env`:

```env
VITE_API_URL=https://vapekhv.ru/api
```

### Команда для создания/обновления:
```bash
cd /root/shop/frontend
echo "VITE_API_URL=https://vapekhv.ru/api" > .env
```

## ✅ После обновления

1. **Пересоберите backend:**
   ```bash
   cd /root/shop/backend
   npm run build
   pm2 restart vapekhv-backend
   ```

2. **Пересоберите frontend:**
   ```bash
   cd /root/shop/frontend
   npm run build
   sudo cp -r dist/* /var/www/vapekhv/
   ```

3. **Проверьте работу:**
   ```bash
curl https://vapekhv.ru/api/health
curl -I https://vapekhv.ru
   ```

## 📋 Пример полного .env файла для backend

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vapekhv?schema=public"

# Server
PORT=3000
NODE_ENV=production

# Domain Configuration
DOMAIN=vapekhv.ru
FRONTEND_URL=https://vapekhv.ru
WEBAPP_URL=https://vapekhv.ru

# JWT
JWT_SECRET=your-secret-key-here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_BOT_USERNAME=your_bot_username
ADMIN_CHAT_IDS=123456789,987654321
CRM_CHAT_IDS=123456789

# MoySklad Integration (опционально)
MOYSKLAD_TOKEN=your-moysklad-token
MOYSKLAD_STORE_ID=your-store-id

# Weather API (опционально)
WEATHER_API_KEY=your-weather-api-key

# Payment Notification Group (опционально)
PAYMENT_NOTIFICATION_CHAT_ID=your-group-chat-id
```

## 📋 Пример полного .env файла для frontend

```env
VITE_API_URL=https://vapekhv.ru/api
```

Для локальной разработки:
```env
VITE_API_URL=http://localhost:3000/api
```

