# Руководство по разработке

## Структура кода

### Backend
- `src/config/` - конфигурация (база данных, логирование, Telegram)
- `src/controllers/` - бизнес-логика
- `src/middleware/` - middleware (аутентификация, обработка ошибок)
- `src/routes/` - определение API маршрутов
- `prisma/` - схема базы данных

### Frontend
- `src/api/` - API клиенты
- `src/components/` - переиспользуемые компоненты
- `src/hooks/` - custom React hooks
- `src/pages/` - страницы приложения
- `src/store/` - state management (Zustand)

## Стандарты кода

### TypeScript
- Всегда используйте строгую типизацию
- Избегайте `any` (используйте `unknown` если нужно)
- Предпочитайте интерфейсы для объектов

### React
- Используйте функциональные компоненты
- Используйте hooks вместо классов
- Мемоизируйте тяжелые вычисления (useMemo, useCallback)

### Именование
- Компоненты: PascalCase (UserProfile.tsx)
- Хуки: camelCase с префиксом use (useAuth.ts)
- Утилиты: camelCase (formatDate.ts)
- Константы: UPPER_SNAKE_CASE
- Файлы API: kebab-case (user-api.ts)

### Git Commits
Используйте conventional commits:
- `feat:` - новая функциональность
- `fix:` - исправление бага
- `docs:` - изменение документации
- `style:` - форматирование, точки с запятой
- `refactor:` - рефакторинг кода
- `test:` - добавление тестов
- `chore:` - обновление задач сборки, package manager

Пример:
```
feat: добавить страницу корзины
fix: исправить ошибку авторизации
docs: обновить README
```

## Разработка

### Создание новой функции

1. Создайте ветку:
```bash
git checkout -b feat/new-feature
```

2. Разработайте функцию
3. Проверьте код:
```bash
npm run lint
```

4. Закоммитьте изменения:
```bash
git add .
git commit -m "feat: описание новой функции"
```

5. Создайте Pull Request

### Добавление нового API endpoint

1. Создайте контроллер в `backend/src/controllers/`
2. Добавьте роуты в `backend/src/routes/`
3. Обновите Prisma схему если нужно
4. Создайте API клиент в `frontend/src/api/`
5. Обновите типы в TypeScript

### Работа с базой данных

#### Создать новую миграцию
```bash
cd backend
npx prisma migrate dev --name название_миграции
```

#### Обновить Prisma Client
```bash
npx prisma generate
```

#### Сбросить БД (development only!)
```bash
npx prisma migrate reset
```

## Тестирование

### Тестирование API
```bash
# Проверить health endpoint
curl http://localhost:3000/health

# Тестовый запрос авторизации
curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData": "..."}'
```

### Проверка типов
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## Деплой

### Подготовка к деплою
1. Обновите версию в package.json
2. Создайте changelog
3. Проверьте .env файлы
4. Запустите production build локально
5. Проверьте все endpoints

### Production deploy
```bash
# Собрать проект
npm run build

# Запустить PM2
npm start

# Проверить логи
pm2 logs
```

## Полезные команды

### Backend
```bash
cd backend

# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Prisma Studio (GUI)
npm run prisma:studio
```

### Frontend
```bash
cd frontend

# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

## Отладка

### Логирование
Backend использует Winston для логирования:
```typescript
import { logger } from './config/logger';

logger.info('Информационное сообщение');
logger.error('Ошибка', error);
logger.debug('Отладочная информация');
```

### Debug режим
```bash
# Backend с debug логами
NODE_ENV=development npm run dev

# Prisma с SQL логами
DATABASE_URL="..." DEBUG="prisma:*" npm run dev
```

## Безопасность

### Чеклист безопасности
- [ ] Никогда не коммитьте .env файлы
- [ ] Используйте сильные JWT секреты
- [ ] Валидируйте все пользовательские данные
- [ ] Используйте prepared statements (Prisma делает это автоматически)
- [ ] Включите rate limiting
- [ ] Используйте HTTPS в production
- [ ] Регулярно обновляйте зависимости

### Обновление зависимостей
```bash
# Проверить устаревшие пакеты
npm outdated

# Обновить все пакеты
npm update

# Проверить уязвимости
npm audit
npm audit fix
```

## Частые проблемы

### Port already in use
```bash
# Найти процесс на порту 3000
lsof -i :3000
# или
netstat -tulpn | grep 3000

# Убить процесс
kill -9 <PID>
```

### Prisma schema out of sync
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### React hot reload не работает
```bash
# Очистить кэш
rm -rf frontend/node_modules/.vite
npm run dev
```

## Вопросы?

Создайте issue в репозитории или свяжитесь с командой.

