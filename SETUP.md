# 🚀 Быстрый старт - VapeKHV Telegram Web App

## Шаг 1: Установка зависимостей

```bash
cd /root/shop
npm install
```

## Шаг 2: Настройка PostgreSQL

### Создать базу данных
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE vapekhv_db;
CREATE USER vapekhv_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE vapekhv_db TO vapekhv_user;
ALTER DATABASE vapekhv_db OWNER TO vapekhv_user;
\q
```

### Обновить DATABASE_URL
Откройте `backend/.env` и замените:
```env
DATABASE_URL="postgresql://vapekhv_user:your_strong_password@localhost:5432/vapekhv_db?schema=public"
```

## Шаг 3: Настройка Telegram бота

### Создать бота
1. Откройте Telegram и найдите **@BotFather**
2. Отправьте `/newbot`
3. Укажите имя бота (например: `VapeKHV Bot`)
4. Укажите username (например: `vapekhv_bot`)
5. **Скопируйте токен** и добавьте в `backend/.env`:

```env
TELEGRAM_BOT_TOKEN=8053503601:AAEZrNjCTysYlO7MuNxq1jt0HUPdrdvU-ww
```

### Настроить Web App
1. В @BotFather отправьте `/newapp`
2. Выберите вашего бота
3. Укажите название (например: `VapeKHV`)
4. Добавьте описание
5. Загрузите фото (512x512 px)
6. Отправьте GIF демо (опционально)
7. **Укажите URL**: `https://vapekhv.live`
8. Выберите короткое имя (например: `vapekhv`)

### Настроить кнопку меню
```
/setmenubutton
-> Выберите вашего бота
-> Отправьте название кнопки: "Открыть магазин"
-> Отправьте URL: https://vapekhv.live
```

## Шаг 4: Запустить миграции базы данных

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

## Шаг 5: Запустить приложение

### Development режим
```bash
npm run dev
```

Откроется:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Production режим (с PM2)
```bash
npm run build
npm start
```

## Шаг 6: Проверить работу

1. Откройте Telegram
2. Найдите вашего бота
3. Нажмите на кнопку меню или отправьте `/start`
4. Нажмите на Web App
5. Должна открыться страница авторизации

## 🔧 Настройка для production

### 1. SSL сертификаты (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vapekhv.live
```

### 2. Nginx конфигурация
```bash
sudo nano /etc/nginx/sites-available/vapekhv
```

```nginx
server {
    listen 80;
    server_name vapekhv.live;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vapekhv.live;

    ssl_certificate /etc/letsencrypt/live/vapekhv.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vapekhv.live/privkey.pem;

    # Frontend
    location / {
        root /root/shop/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vapekhv /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Обновить .env файлы для production

**backend/.env**
```env
NODE_ENV=production
PORT=3000
DOMAIN=vapekhv.live
DATABASE_URL="postgresql://vapekhv_user:your_strong_password@localhost:5432/vapekhv_db?schema=public"
TELEGRAM_BOT_TOKEN=your_real_token
JWT_SECRET=generate_random_64_char_string_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://vapekhv.live
```

**frontend/.env**
```env
VITE_API_URL=https://vapekhv.live/api
VITE_APP_NAME=VapeKHV
```

### 4. Собрать и запустить
```bash
npm run build
npm start
```

### 5. Проверить статус PM2
```bash
pm2 status
pm2 logs
pm2 monit
```

## ✅ Чеклист перед запуском

- [ ] PostgreSQL установлен и запущен
- [ ] База данных создана
- [ ] DATABASE_URL настроен в backend/.env
- [ ] Telegram бот создан
- [ ] TELEGRAM_BOT_TOKEN добавлен в backend/.env
- [ ] Web App настроен в @BotFather
- [ ] SSL сертификаты установлены (для production)
- [ ] Nginx настроен (для production)
- [ ] Миграции выполнены (prisma migrate)
- [ ] JWT_SECRET изменен на случайную строку
- [ ] FRONTEND_URL и VITE_API_URL совпадают с доменом

## 🆘 Помощь

### Проблемы с БД
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Перезапустить PostgreSQL
sudo systemctl restart postgresql

# Войти в psql
sudo -u postgres psql

# Показать все базы
\l

# Подключиться к базе
\c vapekhv_db

# Показать таблицы
\dt
```

### Проблемы с Prisma
```bash
cd backend

# Сбросить и пересоздать БД (ВНИМАНИЕ: удалит все данные)
npx prisma migrate reset

# Создать новую миграцию
npx prisma migrate dev --name your_migration_name

# Применить миграции в production
npx prisma migrate deploy
```

### Логи PM2
```bash
# Все логи
pm2 logs

# Только ошибки
pm2 logs --err

# Очистить логи
pm2 flush
```

## 🎉 Готово!

Теперь ваше приложение должно работать на https://vapekhv.live

