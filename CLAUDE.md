# VapeKHV - Telegram Web App Store

Используй context7.
После добавления чего-то нового/исправления ошибок - коммить все на гитхаб.

## 🎯 О проекте

VapeKHV - это Telegram Web App для магазина вейп-продукции с интеграцией Telegram авторизации, каталогом товаров, корзиной и системой лояльности.

## 🛠 Технологический стек

### Frontend
- **React 18.2** + **Vite 5** + **TypeScript 5.3**
- **Tailwind CSS 3.4** - стилизация с интеграцией Telegram темы
- **Zustand 4.4** - управление состоянием аутентификации (с persistence)
- **React Query 5.15** - кеширование и управление серверным состоянием
- **React Router 6.21** - маршрутизация
- **Framer Motion 10.16** - анимации
- **Lucide React** - иконки
- **React Hot Toast** - уведомления
- **Axios 1.6** - HTTP клиент
- **Telegram WebApp API** - нативная интеграция

### Backend
- **Node.js 20+** + **Express 4.18** + **TypeScript 5.3**
- **PostgreSQL 16** + **Prisma 5.7** - база данных и ORM
- **JWT** - аутентификация
- **node-telegram-bot-api** - интеграция с Telegram Bot
- **Winston** - логирование
- **Helmet + CORS + Rate Limiting** - безопасность

### DevOps
- **PM2** - управление процессами
- **Nginx** - веб-сервер
- **npm workspaces** - монорепозиторий

## 📁 Структура проекта

```
shop/
├── frontend/              # React приложение
│   ├── src/
│   │   ├── api/          # API клиенты (auth, product, cart, user, bonus)
│   │   ├── pages/        # Страницы (Dashboard, Catalog, Cart, Profile, etc.)
│   │   ├── components/   # Компоненты (BottomNav, ProductOptionsModal, etc.)
│   │   ├── store/        # Zustand хранилища (authStore)
│   │   ├── hooks/        # Хуки (useTelegramApp)
│   │   ├── index.css     # Tailwind + Telegram theme переменные
│   │   └── App.tsx       # Главный компонент с роутингом
│   ├── vite.config.ts    # Конфигурация Vite с proxy
│   └── tailwind.config.js # Кастомные цвета Telegram
├── backend/              # Express сервер
│   ├── src/
│   │   ├── controllers/  # Обработчики (auth, user, product, cart, bonus)
│   │   ├── routes/       # Express маршруты
│   │   ├── middleware/   # Middleware (auth, errorHandler)
│   │   ├── config/       # Конфиг (database, telegram, logger)
│   │   └── index.ts      # Инициализация Express
│   └── prisma/
│       └── schema.prisma # Схема БД
└── package.json          # Root workspace конфигурация
```

## 🎨 Дизайн система

### Telegram Theme Integration
Проект использует **нативную тему Telegram** с автоматической поддержкой светлой/темной темы:

```css
/* CSS переменные синхронизируются с Telegram */
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-hint-color
--tg-theme-link-color
--tg-theme-button-color
--tg-theme-button-text-color
--tg-theme-secondary-bg-color
```

### Tailwind Custom Colors
```javascript
// tailwind.config.js
colors: {
  'tg-bg': 'var(--tg-theme-bg-color)',
  'tg-text': 'var(--tg-theme-text-color)',
  'tg-hint': 'var(--tg-theme-hint-color)',
  'tg-link': 'var(--tg-theme-link-color)',
  'tg-button': 'var(--tg-theme-button-color)',
  'tg-button-text': 'var(--tg-theme-button-text-color)',
  'tg-secondary-bg': 'var(--tg-theme-secondary-bg-color)',
}
```

### UI Принципы
- **Mobile-first** - приоритет мобильного интерфейса
- **Плавные анимации** - Framer Motion для переходов
- **Haptic feedback** - тактильная обратная связь Telegram
- **Адаптивность** - автоматическое переключение темы
- **Консистентность** - единообразное расположение элементов в карточках

## 🔑 Основные фичи

1. **Telegram аутентификация** - автоматический вход через Telegram WebApp
2. **Каталог товаров** - фильтрация по категориям, поиск, варианты товаров
3. **Корзина** - добавление/удаление, выбор характеристик, подсчет итога
4. **Программа лояльности** - начисление/списание бонусов, история транзакций
5. **Профиль пользователя** - информация из Telegram, обновление телефона
6. **История заказов** - отслеживание статуса, использованные бонусы

## 🚀 Команды разработки

### Важно! ⚠️
- **НИКОГДА не запускай `npm run dev`** - это правило для продакшн окружения
- **Используй `npm run build`** для проверки компиляции кода
- Проверяй результаты сборки и исправляй ошибки при необходимости

### Build команды
```bash
# Сборка всего проекта (frontend + backend)
npm run build

# Сборка только frontend
npm run build:frontend

# Сборка только backend
npm run build:backend
```

### Проверка кода
```bash
# TypeScript проверка
npm run build  # Покажет все ошибки типизации

# Линтинг
npm run lint
```

### База данных
```bash
# Применить миграции
cd backend
npx prisma migrate dev

# Открыть Prisma Studio
npx prisma studio

# Генерация Prisma Client
npx prisma generate
```

## 📡 API Endpoints

**Base URL**: `https://vapekhv.live/api`

### Authentication
- `POST /auth/telegram` - вход через Telegram WebApp
- `GET /auth/verify` - проверка JWT токена

### Products
- `GET /categories` - список категорий
- `GET /products` - список товаров (фильтры: categoryId, search, featured)
- `GET /products/:id` - детали товара

### Cart
- `GET /cart` - получить корзину
- `POST /cart/add` - добавить товар
- `PUT /cart/:id` - обновить количество
- `DELETE /cart/:id` - удалить товар
- `DELETE /cart` - очистить корзину

### User
- `GET /users/profile` - профиль пользователя
- `PUT /users/profile` - обновить профиль

### Bonus
- `GET /bonus` - баланс и история бонусов
- `POST /bonus/calculate` - расчет бонусов для заказа

## 🗄 База данных

### Основные модели (Prisma)

- **User** - пользователи (Telegram ID, бонусы, профиль)
- **Product** - товары (название, цена, изображения, характеристики)
- **Category** - категории товаров
- **CartItem** - товары в корзине
- **Order** - заказы (статус, сумма, использованные бонусы)
- **OrderItem** - товары в заказе
- **BonusTransaction** - история бонусов (начисление/списание)
- **ProductCharacteristic** - характеристики товара (вкус, размер)
- **ProductVariant** - варианты товара (SKU, цена, остаток)

## 🔐 Аутентификация

1. Frontend получает `initData` из Telegram WebApp API
2. Отправляет на `POST /auth/telegram`
3. Backend парсит и валидирует подпись Telegram
4. Создает/обновляет пользователя в БД
5. Возвращает JWT токен
6. Frontend сохраняет токен в Zustand store (localStorage)
7. Axios interceptor автоматически добавляет `Authorization: Bearer {token}`

## 🎯 State Management

### Client State (Zustand)
- **authStore** - JWT токен, данные пользователя, статус авторизации
- **Persistence** - автосохранение в localStorage

### Server State (React Query)
- **Кеширование** - 5 минут stale time
- **Auto refetch** - при ошибках (1 retry)
- **Query keys**: `['categories']`, `['products']`, `['cart']`, `['profile']`
- **Mutations** - автоматическая инвалидация кеша после изменений

## 🌐 Переменные окружения

### Frontend (.env)
```env
VITE_API_URL=https://vapekhv.live/api
VITE_APP_NAME=VapeKHV
```

### Backend (.env)
```env
NODE_ENV=production
PORT=3000
DOMAIN=vapekhv.live
DATABASE_URL="postgresql://user:password@localhost:5432/vapekhv_db?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://vapekhv.live
```

## 📦 Деплой на сервер

### Структура на сервере
```
/var/www/vapekhv/        # Frontend (dist файлы)
/home/user/shop/         # Backend + исходники
```

### Процесс деплоя
1. Сборка проекта: `npm run build`
2. Копирование frontend: `sudo cp -r frontend/dist/* /var/www/vapekhv/`
3. Перезагрузка Nginx: `sudo systemctl reload nginx`
4. Перезапуск backend: `pm2 restart vapekhv-backend`

## 🎨 UI/UX Guidelines

### Карточки товаров
- **Единообразное расположение кнопок**: все кнопки (+, -, "Добавить") должны быть на одинаковых позициях
- **Плейсхолдер для изображений**: товары без фото показывают дефолтное изображение
- **Hover эффекты**: плавные переходы при наведении
- **Анимации**: Framer Motion для появления/исчезновения

### Цветовая схема
- Используй **только Telegram theme переменные** (`tg-*` классы)
- Не хардкодь цвета - приложение должно адаптироваться к теме пользователя
- Для акцентов используй `tg-button` и `tg-link`

### Типографика
- Системные шрифты: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`
- Responsive размеры через Tailwind (`text-sm`, `text-lg`, etc.)
- Отступы: единообразные (`p-4`, `mb-4`, etc.)

## 🐛 Отладка

### Frontend ошибки
```bash
# Проверка TypeScript
cd frontend
npm run build

# Логи в браузере
# Telegram WebApp API errors будут в console
```

### Backend ошибки
```bash
# Логи через Winston
tail -f backend/logs/error.log

# PM2 логи
pm2 logs vapekhv-backend
```

### База данных
```bash
# Подключение к PostgreSQL
psql -U postgres -d vapekhv_db

# Просмотр таблиц
\dt

# Prisma Studio (GUI)
cd backend
npx prisma studio
```

## 📚 Полезные файлы

| Файл | Описание |
|------|----------|
| `frontend/src/api/client.ts` | Axios конфигурация с interceptors |
| `frontend/src/hooks/useTelegramApp.ts` | Интеграция Telegram WebApp |
| `frontend/src/store/authStore.ts` | Zustand auth store |
| `backend/src/middleware/auth.ts` | JWT верификация |
| `backend/src/config/telegram.ts` | Парсинг Telegram initData |
| `backend/prisma/schema.prisma` | Схема базы данных |
| `frontend/tailwind.config.js` | Кастомные Telegram цвета |

## ⚡️ Performance

- **Code splitting**: Manual chunks для React vendor кода
- **Query caching**: React Query с 5 мин stale time
- **Lazy loading**: React.lazy для тяжелых компонентов
- **Image optimization**: Сжатие на беке перед сохранением

## 🔒 Безопасность

- **Helmet** - защита HTTP headers
- **CORS** - ограничение origins
- **Rate Limiting** - защита от DDoS
- **JWT** - токены с истечением (7 дней)
- **Telegram signature validation** - проверка подлинности initData
- **Prisma** - защита от SQL injection

## 📝 Соглашения о коде

### TypeScript
- Используй **строгую типизацию** (`strict: true`)
- Избегай `any` - используй `unknown` или generic types
- Интерфейсы для props компонентов

### React
- **Functional components** + hooks
- **React Query** для server state, **Zustand** для client state
- Props деструктуризация в сигнатуре функции
- Мемоизация (`useMemo`, `useCallback`) для тяжелых вычислений

### Styling
- **Tailwind classes** вместо inline styles
- **Telegram theme variables** обязательны
- Mobile-first подход (`sm:`, `md:`, `lg:` breakpoints)

### Git
- Коммиты на английском
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Ветки: `feature/название`, `bugfix/название`

## 🚨 Важные правила

1. ❌ **НЕ запускай `npm run dev`** в продакшн окружении
2. ✅ **Всегда используй `npm run build`** для проверки кода
3. ✅ **Тестируй в Telegram WebApp** - не только в браузере
4. ✅ **Проверяй темную тему** - используй Telegram переменные
5. ✅ **Единообразие UI** - кнопки на одинаковых местах
6. ✅ **Плейсхолдеры** - для товаров без изображений
7. ✅ **TypeScript строгий** - исправляй все ошибки типов

## 🔧 Git Workflow (MacBook → Server)

### Настройка GitHub репозитория
1. Создай репозиторий на GitHub
2. Добавь remote: `git remote add origin https://github.com/username/vapekhv.git`
3. Push: `git push -u origin main`

### Workflow для разработки
1. **На MacBook**: вноси изменения, коммить, пуш
2. **На сервере**: pull изменения и деплой одной командой

### Скрипт деплоя на сервере
```bash
#!/bin/bash
# deploy.sh - запускай на сервере для обновления

echo "🔄 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building project..."
npm run build

echo "📁 Deploying frontend..."
sudo cp -r frontend/dist/* /var/www/vapekhv/
sudo systemctl reload nginx

echo "🔄 Restarting backend..."
pm2 restart vapekhv-backend

echo "✅ Deployment complete!"
```

Сделай скрипт исполняемым: `chmod +x deploy.sh`

---

**Разработано с ❤️ для VapeKHV Telegram Web App**
