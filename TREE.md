# 🌳 Структура проекта

```
/root/shop/
│
├── 📁 backend/                    # Node.js Backend
│   ├── 📁 src/
│   │   ├── 📁 config/
│   │   │   ├── database.ts        # Prisma подключение
│   │   │   ├── logger.ts          # Winston настройка
│   │   │   └── telegram.ts        # Telegram Bot API
│   │   │
│   │   ├── 📁 controllers/
│   │   │   ├── auth.controller.ts # Авторизация
│   │   │   └── user.controller.ts # Пользователи
│   │   │
│   │   ├── 📁 middleware/
│   │   │   ├── auth.ts            # JWT проверка
│   │   │   └── errorHandler.ts   # Обработка ошибок
│   │   │
│   │   ├── 📁 routes/
│   │   │   ├── auth.routes.ts     # /api/auth
│   │   │   └── user.routes.ts     # /api/users
│   │   │
│   │   └── index.ts               # ⚡ Entry point
│   │
│   ├── 📁 prisma/
│   │   └── schema.prisma          # 🗄️ БД схема
│   │
│   ├── 📁 logs/                   # 📝 Логи
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   └── .eslintrc.cjs
│
├── 📁 frontend/                   # React Frontend
│   ├── 📁 src/
│   │   ├── 📁 api/
│   │   │   ├── client.ts          # Axios клиент
│   │   │   ├── auth.ts            # Auth API
│   │   │   └── user.ts            # User API
│   │   │
│   │   ├── 📁 components/
│   │   │   └── LoadingScreen.tsx  # Экран загрузки
│   │   │
│   │   ├── 📁 hooks/
│   │   │   └── useTelegramApp.ts  # Telegram хуки
│   │   │
│   │   ├── 📁 pages/
│   │   │   ├── AuthPage.tsx       # 🔐 Авторизация
│   │   │   └── ProfilePage.tsx    # 👤 Профиль
│   │   │
│   │   ├── 📁 store/
│   │   │   └── authStore.ts       # Zustand store
│   │   │
│   │   ├── App.tsx                # 🎯 Главный компонент
│   │   ├── main.tsx               # ⚡ Entry point
│   │   ├── index.css              # 🎨 Глобальные стили
│   │   └── vite-env.d.ts          # TypeScript типы
│   │
│   ├── 📁 public/
│   │   └── robots.txt
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── .eslintrc.cjs
│
├── 📁 scripts/                    # 🛠️ Утилиты
│   ├── setup.sh                   # Автоматическая настройка
│   ├── init-db.sh                 # Инициализация БД
│   └── generate-jwt-secret.js     # Генератор секрета
│
├── 📁 logs/                       # 📊 Логи PM2
│
├── 📁 .vscode/                    # VS Code настройки
│   ├── settings.json
│   └── extensions.json
│
├── 📄 package.json                # Root package
├── 📄 ecosystem.config.js         # PM2 конфигурация
│
├── 📚 README.md                   # Полная документация
├── 📚 QUICKSTART.md               # Быстрый старт (5 мин)
├── 📚 SETUP.md                    # Детальная настройка
├── 📚 CONTRIBUTING.md             # Для разработчиков
├── 📚 PROJECT_SUMMARY.md          # Сводка проекта
├── 📚 CHANGELOG.md                # История изменений
├── 📚 TREE.md                     # Это файл!
│
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── .editorconfig
├── .nvmrc
└── LICENSE

```

## 📊 Статистика

- **Всего файлов:** ~50
- **Backend TypeScript файлов:** 10
- **Frontend TypeScript файлов:** 12
- **Конфигурационных файлов:** 15
- **Документации:** 7 файлов

## 🎯 Ключевые файлы

### Backend
| Файл | Описание |
|------|----------|
| `src/index.ts` | Точка входа, Express сервер |
| `src/config/database.ts` | Prisma подключение |
| `src/controllers/auth.controller.ts` | Telegram авторизация |
| `prisma/schema.prisma` | Схема базы данных |

### Frontend
| Файл | Описание |
|------|----------|
| `src/main.tsx` | Точка входа React |
| `src/App.tsx` | Роутинг и layout |
| `src/pages/AuthPage.tsx` | Страница авторизации |
| `src/pages/ProfilePage.tsx` | Страница профиля |
| `src/store/authStore.ts` | State management |

### Config
| Файл | Описание |
|------|----------|
| `package.json` | NPM workspaces |
| `ecosystem.config.js` | PM2 конфигурация |
| `.eslintrc.json` | ESLint правила |
| `.prettierrc` | Prettier форматирование |

## 🔄 Поток данных

```
Telegram User
     ↓
Frontend (React)
     ↓
API Request (Axios)
     ↓
Backend Routes (Express)
     ↓
Controllers (Business Logic)
     ↓
Prisma ORM
     ↓
PostgreSQL Database
```

## 🌐 API Endpoints Flow

```
POST /api/auth/telegram
  → auth.controller.ts → telegramAuth()
    → parseTelegramUser()
    → prisma.user.create/update()
    → generateToken()
    → return { token, user }

GET /api/users/profile
  → authMiddleware → verify JWT
  → user.controller.ts → getProfile()
    → prisma.user.findUnique()
    → return { user }
```

## 📦 Зависимости

### Backend (27 пакетов)
```
Production:
- @prisma/client, express, prisma
- jsonwebtoken, axios, zod
- winston, helmet, cors, compression
- express-rate-limit, node-telegram-bot-api

Development:
- typescript, ts-node, nodemon
- @types/* packages
- eslint, prettier
```

### Frontend (23 пакета)
```
Production:
- react, react-dom, react-router-dom
- @tanstack/react-query
- zustand, axios, zod
- framer-motion, lucide-react
- react-hot-toast, date-fns
- tailwindcss

Development:
- vite, @vitejs/plugin-react
- typescript, @types/* packages
- eslint, prettier
```

## 🚀 Команды запуска

```bash
# Development
npm run dev              # Все сервисы
npm run dev:backend      # Только backend
npm run dev:frontend     # Только frontend

# Production
npm run build           # Собрать все
npm start               # Запустить PM2
npm stop                # Остановить PM2

# Database
npm run prisma:studio   # GUI для БД
npm run prisma:migrate  # Миграции

# Utilities
npm run setup           # Автонастройка
npm run init-db         # Создать БД
npm run generate-secret # JWT секрет
```

## 🎨 UI Компоненты

```
App
├── BrowserRouter
│   └── Routes
│       ├── /auth → AuthPage
│       │   ├── LoadingScreen (conditional)
│       │   ├── Login Button
│       │   └── Framer Motion animations
│       │
│       └── /profile → ProfilePage
│           ├── LoadingScreen (conditional)
│           ├── Profile Card
│           │   ├── Avatar
│           │   ├── User Info
│           │   └── Premium Badge
│           └── Logout Button
│
└── Toaster (React Hot Toast)
```

## 🔐 Безопасность

```
Frontend                Backend               Database
  ↓                       ↓                      ↓
Telegram InitData → JWT Validation → Prisma ORM
  ↓                       ↓                      ↓
localStorage     → Rate Limiting  → PostgreSQL
  ↓                       ↓                      ↓
Auto logout      → Helmet Headers → Row Level Security
```

---

Создано: 2025-10-17  
Версия: 1.0.0  
Статус: ✅ Production Ready

