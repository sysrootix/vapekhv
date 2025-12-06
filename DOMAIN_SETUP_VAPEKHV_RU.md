# 🚀 Настройка домена vapekhv.ru

## ✅ Что уже сделано

1. ✅ Все упоминания домена заменены на `vapekhv.ru` в:
   - Конфигурации Nginx (`nginx/vapekhv.ru.conf`)
   - Скриптах деплоя
   - Документации

2. ✅ Создана конфигурация Nginx для `vapekhv.ru`
3. ✅ Создан скрипт для получения SSL сертификатов (`scripts/setup-ssl.sh`)

## 📋 Следующие шаги для применения на сервере

### 1. Настройка DNS

Убедитесь, что DNS записи для `vapekhv.ru` и `www.vapekhv.ru` настроены и указывают на IP вашего сервера:

```bash
dig vapekhv.ru
dig www.vapekhv.ru
```

### 2. Получение SSL сертификатов

Запустите скрипт для автоматической настройки SSL:

```bash
cd /root/shop
sudo ./scripts/setup-ssl.sh
```

Или вручную:

```bash
# Установка certbot (если еще не установлен)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot certonly --nginx -d vapekhv.ru -d www.vapekhv.ru
```

### 3. Настройка Nginx

```bash
# Копирование конфигурации
sudo cp /root/shop/nginx/vapekhv.ru.conf /etc/nginx/sites-available/vapekhv.conf

# Проверка конфигурации
sudo nginx -t

# Активация конфигурации
sudo ln -sf /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-enabled/vapekhv.conf

# Перезагрузка Nginx
sudo systemctl reload nginx
```

### 4. Обновление переменных окружения Backend

Отредактируйте `/root/shop/backend/.env`:

```env
DOMAIN=vapekhv.ru
FRONTEND_URL=https://vapekhv.ru
WEBAPP_URL=https://vapekhv.ru
```

Или используйте команду:

```bash
cd /root/shop/backend
sed -i 's/vapekhv\.top/vapekhv.ru/g' .env
sed -i 's|https://vapekhv.ru|https://vapekhv.ru|g' .env
```

### 5. Обновление переменных окружения Frontend

Создайте или обновите `/root/shop/frontend/.env`:

```env
VITE_API_URL=https://vapekhv.ru/api
```

Или используйте команду:

```bash
cd /root/shop/frontend
echo "VITE_API_URL=https://vapekhv.ru/api" > .env
```

### 6. Пересборка и деплой

```bash
cd /root/shop

# Пересборка backend
cd backend
npm run build
cd ..

# Пересборка frontend
cd frontend
npm run build
cd ..

# Деплой frontend
sudo cp -r frontend/dist/* /var/www/vapekhv/

# Перезапуск backend
pm2 restart vapekhv-backend
```

### 7. Обновление Telegram Bot

В настройках Telegram Bot (@BotFather):

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Menu Button"
5. Установите URL: `https://vapekhv.ru`

Или через API:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://vapekhv.ru/api/webhook"
```

### 8. Проверка работоспособности

```bash
# Проверка API
curl https://vapekhv.ru/api/health

# Проверка frontend
curl -I https://vapekhv.ru

# Проверка SSL
openssl s_client -connect vapekhv.ru:443 -servername vapekhv.ru
```

## 🔄 Автоматическое обновление SSL сертификатов

Certbot автоматически настроит автообновление сертификатов. Проверить можно командой:

```bash
sudo certbot renew --dry-run
```

## 📝 Примечания

- Старый домен `vapekhv.ru` больше не используется
- Все ссылки обновлены на `vapekhv.ru`
- Конфигурация Nginx включает поддержку SSL и редирект с HTTP на HTTPS
- Логи Nginx: `/var/log/nginx/vapekhv_access.log` и `/var/log/nginx/vapekhv_error.log`

## 🆘 Если что-то пошло не так

1. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/vapekhv_error.log`
2. Проверьте логи backend: `pm2 logs vapekhv-backend`
3. Проверьте статус PM2: `pm2 status`
4. Проверьте конфигурацию Nginx: `sudo nginx -t`


