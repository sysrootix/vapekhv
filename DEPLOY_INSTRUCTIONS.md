# Инструкции по деплою интеграции с МойСклад

## Проблема: Код не компилируется

Если синхронизация не работает после обновления - скорее всего код не скомпилирован.

## Решение: Полная пересборка на сервере

### 1. Коммит и пуш изменений (на MacBook)

```bash
cd ~/Desktop/work/shop

# Проверить изменения
git status

# Добавить все файлы
git add .

# Создать коммит
git commit -m "Интеграция с МойСклад - полная версия"

# Отправить на сервер
git push origin main
```

### 2. Обновление на сервере

Подключитесь к серверу по SSH и выполните:

```bash
# Перейти в директорию проекта
cd ~/shop

# Остановить бэкенд
pm2 stop vapekhv-backend

# Получить последние изменения
git pull origin main

# Установить зависимости (включая node-cron)
npm install

# Применить миграции Prisma
cd backend
npx prisma migrate dev --name add_moysklad_integration
npx prisma generate
cd ..

# Собрать проект
npm run build

# Проверить, что файлы скомпилированы
ls -la backend/dist/services/

# Должны быть файлы:
# - moysklad.api.js
# - sync.service.js
# - scheduler.service.js
# - image.service.js

# Запустить бэкенд
pm2 start vapekhv-backend

# Проверить логи
pm2 logs vapekhv-backend --lines 30
```

### 3. Настройка переменных окружения

Убедитесь, что файл `.env` содержит:

```bash
# Открыть .env
nano ~/shop/backend/.env
```

Добавить/проверить:

```env
# МойСклад токен (ОБЯЗАТЕЛЬНО!)
MOYSKLAD_TOKEN=ваш_реальный_токен_из_moysklad

# ID администраторов (ваш Chat ID)
ADMIN_CHAT_IDS=1008837582

# Остальные переменные...
NODE_ENV=production
PORT=3000
DOMAIN=vapekhv.live
DATABASE_URL="postgresql://..."
TELEGRAM_BOT_TOKEN=...
JWT_SECRET=...
FRONTEND_URL=https://vapekhv.live
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Перезапуск с новыми переменными

```bash
# Перезапустить с обновленными переменными
pm2 restart vapekhv-backend --update-env

# Или полная перезагрузка
pm2 delete vapekhv-backend
pm2 start ecosystem.config.js

# Проверить логи
pm2 logs vapekhv-backend --lines 50
```

### 5. Проверка работы

В логах должны появиться строки:

```
✅ Database connected successfully
🤖 Инициализация Telegram бота...
✅ Telegram бот успешно запущен
✅ МойСклад конфигурация валидна          ← ВАЖНО!
📅 Планировщик синхронизации запущен      ← ВАЖНО!
🔄 Запуск первоначальной синхронизации    ← ВАЖНО!
🚀 Server is running on port 3000
```

Если видите:
```
⚠️ МойСклад не настроен, синхронизация отключена
💡 Добавьте MOYSKLAD_TOKEN в .env
```

Значит токен не установлен или некорректный.

### 6. Тест команды /sync

В Telegram отправьте боту:

```
/sync
```

Ожидаемый ответ:

```
🔄 Синхронизация с МойСклад

Запускаю синхронизацию каталога...
Это может занять несколько минут.
```

Затем:

```
✅ Синхронизация завершена!

⏱️ Время выполнения: X.XXс
📦 Каталог товаров обновлен

Запущено: YourName
```

## Troubleshooting

### Ошибка: "У вас нет доступа к этой команде"

Проверьте `ADMIN_CHAT_IDS` в `.env`:

```bash
# Узнать свой Chat ID
# 1. Написать боту /start
# 2. Посмотреть логи:
pm2 logs vapekhv-backend | grep "запустил бота"

# Должна быть строка вида:
# ✅ Пользователь sysrootix (ID: 1008837582) запустил бота
#                                 ^^^^^^^^^^ это ваш ID
```

Добавить ID в `.env`:

```env
ADMIN_CHAT_IDS=1008837582
```

Перезапустить:

```bash
pm2 restart vapekhv-backend --update-env
```

### Ошибка: "MOYSKLAD_TOKEN не установлен"

Получить токен:
1. Открыть https://online.moysklad.ru
2. Настройки → Пользователи и права → Сотрудники
3. Выбрать пользователя → API → Сгенерировать токен
4. Скопировать токен (длинная строка)

Добавить в `.env`:

```env
MOYSKLAD_TOKEN=скопированный_токен_без_пробелов
```

### Команда /sync висит или не отвечает

Проверить логи:

```bash
pm2 logs vapekhv-backend --err
```

Типичные ошибки:
- **401 Unauthorized** - неверный токен МойСклад
- **Network error** - проблемы с интернетом на сервере
- **Database error** - проблемы с БД

### Синхронизация запускается, но товары не появляются

Проверить БД:

```bash
psql -U postgres -d vapekhv_db

# Проверить категории
SELECT id, name, "moySkladId" FROM categories;

# Проверить товары
SELECT id, name, price, "stockCount", "moySkladId" FROM products;

# Выход
\q
```

Если товаров нет - проверить:
1. Есть ли товары в МойСклад (не архивированные)
2. Есть ли у товаров категории
3. Логи синхронизации: `pm2 logs vapekhv-backend`

### Изображения не загружаются

Проверить директорию:

```bash
ls -la ~/shop/backend/uploads/products/

# Создать директорию если нет
mkdir -p ~/shop/backend/uploads/products
chmod -R 755 ~/shop/backend/uploads
```

Проверить в браузере:

```
https://vapekhv.live/uploads/products/
```

Должен вернуть 404 (норма) или список файлов.

## Быстрая проверка интеграции

```bash
# 1. Проверить переменные окружения
pm2 env 0 | grep -E "(MOYSKLAD|ADMIN)"

# 2. Проверить скомпилированные файлы
ls -la ~/shop/backend/dist/services/ | grep -E "sync|moysklad|scheduler"

# 3. Проверить логи при старте
pm2 restart vapekhv-backend && sleep 2 && pm2 logs vapekhv-backend --lines 20

# 4. Проверить БД
psql -U postgres -d vapekhv_db -c "SELECT COUNT(*) FROM categories;"
psql -U postgres -d vapekhv_db -c "SELECT COUNT(*) FROM products;"

# 5. Тест API
curl http://localhost:3000/health
curl http://localhost:3000/api/categories
```

## Полезные команды PM2

```bash
# Информация о процессе
pm2 info vapekhv-backend

# Переменные окружения
pm2 env 0

# Перезапуск с новым .env
pm2 restart vapekhv-backend --update-env

# Логи в реальном времени
pm2 logs vapekhv-backend

# Только ошибки
pm2 logs vapekhv-backend --err

# Последние 100 строк
pm2 logs vapekhv-backend --lines 100

# Мониторинг CPU/Memory
pm2 monit

# Список процессов
pm2 list

# Удалить и пересоздать процесс
pm2 delete vapekhv-backend
pm2 start ecosystem.config.js
```

## Если ничего не помогает

Полная переустановка:

```bash
cd ~/shop

# Остановить все
pm2 stop all

# Удалить скомпилированные файлы
rm -rf backend/dist
rm -rf frontend/dist
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Установить зависимости
npm install

# Применить миграции
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

# Собрать проект
npm run build

# Проверить сборку
ls -la backend/dist/
ls -la backend/dist/services/

# Запустить
pm2 start ecosystem.config.js

# Проверить логи
pm2 logs vapekhv-backend
```

---

**После успешного деплоя** проверьте команду `/sync` в Telegram!
