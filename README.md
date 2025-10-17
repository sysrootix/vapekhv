# VapeKHV - Telegram Web App

Современное Telegram Web App приложение с авторизацией и профилем пользователя.

## 🚀 Технологии

### Frontend
- **React 18** + **Vite 5** - быстрая разработка и сборка
- **TypeScript** - типизация
- **@telegram-apps/sdk-react** - интеграция с Telegram
- **@telegram-apps/telegram-ui** - нативные Telegram компоненты
- **Zustand** - state management
- **TanStack Query (React Query v5)** - умное кеширование
- **Framer Motion** - плавные анимации
- **Tailwind CSS** - современные стили
- **Axios** - HTTP клиент
- **React Hook Form + Zod** - формы и валидация
- **React Hot Toast** - уведомления
- **Lucide React** - иконки
- **date-fns** - работа с датами

### Backend
- **Node.js 20+** + **Express**
- **PostgreSQL 16** + **Prisma**
- **JWT** - аутентификация
- **node-telegram-bot-api** - Telegram Bot API
- **Zod** - валидация
- **Winston** - логирование
- **Helmet** - безопасность
- **Compression** - сжатие
- **Express Rate Limit** - защита от DDoS

## 📋 Требования

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 14
- Telegram Bot (токен от @BotFather)

## ⚙️ Установка

### 1. Клонировать репозиторий (если применимо)
```bash
cd /root/shop
```

### 2. Установить зависимости
```bash
npm install
```

Это установит зависимости для root, backend и frontend благодаря workspaces.

### 3. Настроить переменные окружения

#### Backend (.env)
Скопируйте `backend/.env.example` в `backend/.env` и заполните:

```env
NODE_ENV=development
PORT=3000
DOMAIN=vapekhv.live

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/vapekhv_db?schema=public"

# Telegram Bot (получить у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://vapekhv.live
```

#### Frontend (.env)
Скопируйте `frontend/.env.example` в `frontend/.env`:

```env
VITE_API_URL=https://vapekhv.live/api
VITE_APP_NAME=VapeKHV
```

### 4. Настроить базу данных

#### Создать базу данных PostgreSQL
```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных и пользователя
CREATE DATABASE vapekhv_db;
CREATE USER vapekhv_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vapekhv_db TO vapekhv_user;
\q
```

#### Запустить миграции Prisma
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 5. Создать Telegram бота

1. Найдите **@BotFather** в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Получите токен бота и добавьте в `backend/.env`
4. Отправьте `/setmenubutton` для настройки кнопки меню
5. Отправьте `/newapp` для создания Web App
6. Укажите URL: `https://vapekhv.live`

## 🏃‍♂️ Запуск

### Development режим

```bash
# Запустить backend и frontend одновременно
npm run dev

# Или по отдельности:
npm run dev:backend
npm run dev:frontend
```

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

### Production режим

#### Собрать проекты
```bash
npm run build
```

#### Запустить с PM2
```bash
npm start
```

#### Остановить
```bash
npm stop
```

#### Перезапустить
```bash
npm restart
```

## 📁 Структура проекта

```
/root/shop/
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── config/         # Конфигурация (DB, Logger, Telegram)
│   │   ├── controllers/    # Контроллеры
│   │   ├── middleware/     # Middleware (auth, errors)
│   │   ├── routes/         # API маршруты
│   │   └── index.ts        # Точка входа
│   ├── prisma/
│   │   └── schema.prisma   # Prisma схема БД
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/           # API клиенты
│   │   ├── components/    # React компоненты
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Страницы
│   │   ├── store/         # Zustand stores
│   │   ├── App.tsx        # Главный компонент
│   │   └── main.tsx       # Точка входа
│   ├── package.json
│   └── vite.config.ts
│
├── package.json           # Root package (workspaces)
├── ecosystem.config.js    # PM2 конфигурация
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/telegram` - Авторизация через Telegram
- `GET /api/auth/verify` - Проверка токена

### Users
- `GET /api/users/profile` - Получить профиль (требует auth)
- `PUT /api/users/profile` - Обновить профиль (требует auth)

## 🎨 Особенности

### Frontend
- ✅ Автоматическое применение Telegram тем (light/dark)
- ✅ Haptic Feedback для кнопок
- ✅ Плавные анимации (Framer Motion)
- ✅ Адаптивный дизайн (mobile-first)
- ✅ Persistent state (Zustand + localStorage)
- ✅ Автоматическая повторная отправка запросов (React Query)
- ✅ Красивые уведомления (React Hot Toast)

### Backend
- ✅ JWT аутентификация
- ✅ Rate limiting (защита от DDoS)
- ✅ Security headers (Helmet)
- ✅ Compression (gzip)
- ✅ Профессиональное логирование (Winston)
- ✅ Graceful shutdown
- ✅ Error handling middleware

## 🔧 Полезные команды

### Backend
```bash
cd backend

# Запустить миграции
npm run prisma:migrate

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio

# Сгенерировать Prisma Client
npm run prisma:generate
```

### Frontend
```bash
cd frontend

# Линтинг
npm run lint

# Preview production build
npm run preview
```

## 🌐 Deployment

### Nginx конфигурация (пример)

```nginx
server {
    listen 443 ssl http2;
    server_name vapekhv.live;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /root/shop/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 TODO (будущие фичи)

- [ ] Добавить функционал магазина
- [ ] Добавить корзину
- [ ] Добавить платежи
- [ ] Добавить админ панель
- [ ] Добавить push уведомления

## 🐛 Troubleshooting

### Ошибка подключения к БД
- Проверьте `DATABASE_URL` в `backend/.env`
- Убедитесь что PostgreSQL запущен: `sudo systemctl status postgresql`

### Telegram Web App не открывается
- Убедитесь что используете HTTPS (Telegram требует)
- Проверьте URL в настройках бота (@BotFather)

### CORS ошибки
- Проверьте `FRONTEND_URL` в `backend/.env`
- Убедитесь что домены совпадают

## 📄 Лицензия

MIT

## 👨‍💻 Автор

VapeKHV Team

