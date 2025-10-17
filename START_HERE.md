# 🎉 Добро пожаловать в VapeKHV Telegram Web App!

## ✅ Что уже сделано

Поздравляем! У вас есть полностью настроенное современное Telegram Web App:

- ✅ **Backend** - Node.js + Express + PostgreSQL + Prisma
- ✅ **Frontend** - React + Vite + TypeScript + Tailwind
- ✅ **Авторизация** - Через Telegram Web App
- ✅ **Профиль** - Страница пользователя с данными
- ✅ **UI/UX** - Адаптивный дизайн, темы Telegram, анимации
- ✅ **DevOps** - PM2, скрипты, логирование
- ✅ **Документация** - 7 файлов с подробными инструкциями

## 🚀 Что делать дальше?

### Вариант А: Быстрый старт (5 минут) ⚡

```bash
# 1. Запустить автонастройку
npm run setup

# 2. Создать Telegram бота (@BotFather)
# Получить токен и добавить в backend/.env

# 3. Настроить БД
npm run init-db

# 4. Запустить!
npm run dev
```

**→ Детали:** см. `QUICKSTART.md`

### Вариант Б: Детальная настройка (15 минут) 📖

Читайте пошаговую инструкцию:
```bash
cat SETUP.md
```

## 📚 Вся документация

| Файл | Для чего |
|------|----------|
| **START_HERE.md** | ← Вы здесь! Начните отсюда |
| **QUICKSTART.md** | Быстрый старт за 5 минут |
| **README.md** | Полная документация проекта |
| **SETUP.md** | Детальная инструкция по настройке |
| **CONTRIBUTING.md** | Для разработчиков |
| **PROJECT_SUMMARY.md** | Что создано, технологии, API |
| **TREE.md** | Визуальная структура проекта |
| **CHANGELOG.md** | История изменений |

## 🎯 Основные команды

```bash
# Development
npm run dev              # Запустить все (backend + frontend)
npm run dev:backend      # Только backend (port 3000)
npm run dev:frontend     # Только frontend (port 5173)

# Production
npm run build           # Собрать проект
npm start               # Запустить с PM2
npm stop                # Остановить PM2
npm logs                # Посмотреть логи

# Database
npm run prisma:studio   # Открыть GUI для БД
npm run prisma:migrate  # Создать миграцию

# Utilities
npm run setup           # Автоматическая настройка
npm run init-db         # Инициализация базы данных
npm run generate-secret # Сгенерировать JWT секрет
```

## 🔑 Что нужно настроить

### 1. Telegram Bot 🤖

Создайте бота через **@BotFather**:
1. `/newbot` - создать бота
2. Получить токен
3. `/newapp` - создать Web App
4. Указать URL: `https://vapekhv.live`

### 2. База данных 🗄️

Настройте PostgreSQL:
```bash
# Автоматически
npm run init-db

# Или вручную
sudo -u postgres psql
CREATE DATABASE vapekhv_db;
```

### 3. Переменные окружения 🔐

Обновите файлы:
- `backend/.env` - DATABASE_URL, TELEGRAM_BOT_TOKEN, JWT_SECRET
- `frontend/.env` - VITE_API_URL

## 🌐 Архитектура

```
┌─────────────┐
│  Telegram   │
│   Client    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│  Frontend (React)               │
│  - Vite                         │
│  - TypeScript                   │
│  - Tailwind CSS                 │
│  - Zustand (State)              │
│  - React Query (Data)           │
└────────────┬────────────────────┘
             │
             ↓ API Requests (Axios)
┌─────────────────────────────────┐
│  Backend (Express)              │
│  - TypeScript                   │
│  - JWT Auth                     │
│  - Rate Limiting                │
│  - Security (Helmet)            │
└────────────┬────────────────────┘
             │
             ↓ Prisma ORM
┌─────────────────────────────────┐
│  PostgreSQL Database            │
│  - Users table                  │
│  - Migrations                   │
└─────────────────────────────────┘
```

## 📱 Как тестировать

### Локально (Development)

1. Установить **ngrok**:
```bash
npm install -g ngrok
```

2. Запустить туннель:
```bash
ngrok http 5173
```

3. Скопировать HTTPS URL (например: `https://abc123.ngrok.io`)

4. В @BotFather → `/newapp` → указать этот URL

5. Открыть бота в Telegram → нажать Web App

### Production

1. Настроить SSL для `vapekhv.live`
2. Собрать проект: `npm run build`
3. Запустить: `npm start`
4. В @BotFather указать `https://vapekhv.live`

## 🆘 Нужна помощь?

### Проблемы с PostgreSQL
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Проблемы с портами
```bash
lsof -i :3000  # Найти процесс
kill -9 <PID>  # Убить процесс
```

### Проблемы с Prisma
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

## 🎨 Что добавить дальше?

### Базовые фичи
- [ ] Каталог товаров
- [ ] Корзина покупок
- [ ] Система заказов
- [ ] Поиск и фильтры

### Продвинутые фичи
- [ ] Платежи (Telegram Payments)
- [ ] Push уведомления
- [ ] Избранное
- [ ] История заказов
- [ ] Отзывы и рейтинги

### Админ панель
- [ ] Управление товарами
- [ ] Управление заказами
- [ ] Статистика и аналитика
- [ ] Управление пользователями

## 📊 Структура проекта

```
/root/shop/
├── backend/       # Node.js + Express
├── frontend/      # React + Vite
├── scripts/       # Утилиты
├── logs/          # Логи
└── docs/          # Документация
```

Детальное дерево: см. `TREE.md`

## 🔐 Безопасность

Реализовано:
- ✅ JWT аутентификация
- ✅ Rate limiting (100 req/15min)
- ✅ CORS политики
- ✅ Security headers (Helmet)
- ✅ Input validation (Zod)
- ✅ SQL injection защита (Prisma)

**⚠️ ВАЖНО для production:**
1. Смените `JWT_SECRET` на случайную строку
2. Используйте HTTPS
3. Обновите `DATABASE_URL` с сильным паролем
4. Настройте backup базы данных

## 🎯 Быстрые ссылки

- 🌐 **Frontend (dev):** http://localhost:5173
- 🔌 **Backend (dev):** http://localhost:3000
- 🗄️ **Prisma Studio:** `npm run prisma:studio`
- 📊 **PM2 Monitoring:** `pm2 monit`
- 📝 **Логи:** `npm run logs`

## 💡 Полезные советы

1. **VS Code**: Установите рекомендуемые расширения (`.vscode/extensions.json`)
2. **Hot Reload**: Frontend и Backend поддерживают hot reload
3. **TypeScript**: Строгая типизация - используйте автодополнение
4. **Prisma Studio**: GUI для просмотра/редактирования БД
5. **PM2**: Автоматический restart при падении

## 🚀 Готовы начать?

```bash
# Один из вариантов:

# 1. Быстрый старт
cat QUICKSTART.md

# 2. Детальная настройка
cat SETUP.md

# 3. Документация для разработчиков
cat CONTRIBUTING.md
```

---

## 📞 Контакты

- 📧 Email: team@vapekhv.live
- 💬 Telegram: @vapekhv_support
- 🌐 Website: https://vapekhv.live

---

**Удачи с вашим проектом! 🎉**

*Создано с ❤️ для VapeKHV*  
*Версия: 1.0.0*  
*Дата: 2025-10-17*

