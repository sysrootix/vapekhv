# ⚡ Быстрая миграция на vapekhv.ru

## 🚀 Быстрый старт (5 минут)

### 1. DNS + SSL (2 минуты)
```bash
# Убедитесь что DNS настроен, затем получите сертификат:
sudo certbot certonly --nginx -d vapekhv.ru -d www.vapekhv.ru
```

### 2. Nginx (1 минута)
```bash
# Скопируйте новую конфигурацию
sudo cp /root/shop/nginx/vapekhv.ru.conf /etc/nginx/sites-available/vapekhv.conf

# Проверьте и активируйте
sudo nginx -t
sudo ln -sf /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-enabled/vapekhv.conf
sudo systemctl reload nginx
```

### 3. Backend .env (30 секунд)
```bash
# Отредактируйте /root/shop/backend/.env:
# DOMAIN=vapekhv.ru
# FRONTEND_URL=https://vapekhv.ru
# WEBAPP_URL=https://vapekhv.ru

# Пересоберите и перезапустите
cd /root/shop/backend
npm run build
pm2 restart vapekhv-backend
```

### 4. Frontend .env (30 секунд)
```bash
# Создайте /root/shop/frontend/.env:
# VITE_API_URL=https://vapekhv.ru/api

# Пересоберите и задеплойте
cd /root/shop/frontend
npm run build
sudo cp -r dist/* /var/www/vapekhv/
```

### 5. Telegram Bot (1 минута)
```
Откройте @BotFather → /mybots → ваш бот → Bot Settings → Menu Button
Установите URL: https://vapekhv.ru
```

### 6. Проверка (30 секунд)
```bash
curl https://vapekhv.ru/api/health
curl -I https://vapekhv.ru
```

## ✅ Готово!

Подробная инструкция: см. `DOMAIN_MIGRATION.md`


