# Исправление проблем с интеграцией МойСклад

## Дата: 17.10.2025

## Исправленные баги

### 1. TypeScript ошибки компиляции
**Проблема**: `Property 'meta' does not exist on type 'MoySkladMeta'`

**Решение**: Создан новый тип `MoySkladReference` для ссылок с мета-информацией:
```typescript
export interface MoySkladReference {
  meta: MoySkladMeta;
}
```

### 2. Ошибка фильтрации вариантов (412 Precondition Failed)
**Проблема**: API МойСклад не поддерживает фильтр `product=https://...`

**Решение**: Изменен фильтр на `productid=${productId}`

### 3. Circular structure error в логах
**Проблема**: При логировании объектов с циклическими ссылками возникала ошибка

**Решение**: Добавлена функция `safeStringify()` для безопасной сериализации

### 4. Изображения не загружаются (404)
**Проблема**: Изображения сохранялись в `/root/shop/backend/uploads/products`, а Nginx ожидал их в `/var/www/vapekhv/uploads/products`

**Решение**: Добавлена переменная окружения `UPLOADS_DIR`

### 5. 504 Gateway Timeout при скачивании изображений
**Проблема**: Скачивание изображений из МойСклад вызывало таймауты и останавливало синхронизацию

**Решение**:
- Добавлены повторные попытки загрузки (до 2 попыток с задержкой)
- Изображения с таймаутами пропускаются, не прерывая синхронизацию
- Улучшено логирование ошибок загрузки

### 6. Неправильный порядок синхронизации
**Проблема**: Товары синхронизировались снизу вверх (старые первыми)

**Решение**: Добавлен реверс массива - теперь синхронизация идет сверху вниз (новые товары первыми)

### 7. TypeScript warning - unused parameter
**Проблема**: `'key' is declared but its value is never read`

**Решение**: Переименован параметр в `_key` для указания, что он намеренно не используется

### 8. Добавлен метод getAssortment()
**Улучшение**: Добавлен новый метод для получения ассортимента через `/entity/assortment` согласно документации МойСклад (готов к использованию в будущем)

---

## Инструкция по деплою на сервер

### БЫСТРЫЙ ДЕПЛОЙ (если уже все настроено)

```bash
cd ~/shop
pm2 stop vapekhv-backend
git pull origin main
npm install
npm run build
pm2 start vapekhv-backend
pm2 logs vapekhv-backend
```

### ПОЛНЫЙ ДЕПЛОЙ (с настройкой)

#### Шаг 1: Подготовка на MacBook

```bash
cd ~/Desktop/work/shop

# Проверить статус
git status

# Добавить все изменения
git add .

# Создать коммит
git commit -m "Fix: МойСклад интеграция - исправление типов, вариантов и изображений"

# Отправить на сервер
git push origin main
```

#### Шаг 2: Обновление на сервере

Подключитесь к серверу по SSH:

```bash
ssh user@vapekhv.live
```

Выполните команды:

```bash
# Перейти в директорию проекта
cd ~/shop

# Остановить backend
pm2 stop vapekhv-backend

# Получить последние изменения
git pull origin main

# Проверить, что изменения подтянулись
git log --oneline -5
```

#### Шаг 3: Настройка переменных окружения

```bash
# Открыть .env
nano ~/shop/backend/.env
```

Добавить в конец файла:

```env
# Uploads (директория для изображений)
UPLOADS_DIR=/var/www/vapekhv/uploads/products
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`

#### Шаг 4: Создание директории для изображений

```bash
# Создать директорию
sudo mkdir -p /var/www/vapekhv/uploads/products

# Установить права доступа
sudo chown -R $USER:$USER /var/www/vapekhv/uploads
sudo chmod -R 755 /var/www/vapekhv/uploads

# Проверить
ls -la /var/www/vapekhv/uploads/
```

#### Шаг 5: Установка зависимостей и сборка

```bash
cd ~/shop

# Установить/обновить зависимости
npm install

# Собрать проект
npm run build
```

**Ожидаемый результат:**
```
✓ Frontend built successfully
✓ Backend built successfully
```

**Если ошибки:**
- Проверьте версию Node.js: `node --version` (должна быть >= 20.0.0)
- Проверьте логи: см. вывод `npm run build`

#### Шаг 6: Проверка скомпилированных файлов

```bash
# Проверить, что файлы скомпилированы
ls -la backend/dist/services/

# Должны быть файлы:
# - moysklad.api.js
# - sync.service.js
# - scheduler.service.js
# - image.service.js
```

#### Шаг 7: Запуск backend

```bash
# Запустить с обновленными переменными окружения
pm2 restart vapekhv-backend --update-env

# Или полный перезапуск
pm2 delete vapekhv-backend
pm2 start ecosystem.config.js

# Проверить статус
pm2 status
```

#### Шаг 8: Проверка логов

```bash
# Смотреть логи в реальном времени
pm2 logs vapekhv-backend

# Или последние 50 строк
pm2 logs vapekhv-backend --lines 50
```

**Ожидаемые логи при успешном запуске:**

```
✅ Database connected successfully
🤖 Инициализация Telegram бота...
✅ Telegram бот успешно запущен
✅ МойСклад конфигурация валидна
📅 Планировщик синхронизации запущен
🔄 Запуск первоначальной синхронизации
🚀 Server is running on port 3000
Получено 15 категорий из МойСклад
Категории синхронизированы: 15
Синхронизация товаров...
Получено 45 товаров из МойСклад
Синхронизировано товаров: 10/45
...
✅ Синхронизация завершена за X.XXс
```

**НЕ должно быть:**
- ❌ `504 Gateway Timeout`
- ❌ `Circular structure error`
- ❌ `Property 'meta' does not exist`
- ❌ `Ошибка фильтрации: неизвестное поле 'product'`

---

## Проверка работы

### 1. Проверить Telegram бота

Откройте бота в Telegram и отправьте:

```
/sync
```

**Ожидаемый ответ:**
```
🔄 Синхронизация с МойСклад

Запускаю синхронизацию каталога...
Это может занять несколько минут.
```

Затем через 1-2 минуты:
```
✅ Синхронизация завершена!

⏱️ Время выполнения: X.XXс
📦 Каталог товаров обновлен

Запущено: YourName
```

### 2. Проверить API

```bash
# На сервере
curl http://localhost:3000/health
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/products | jq '.products | length'
```

### 3. Проверить изображения

```bash
# Проверить, что изображения загружаются
ls -la /var/www/vapekhv/uploads/products/

# Должны быть файлы вида:
# c3771414791b7a648b9acf1f1538d275.jpg
# d2d936c473404cbabcee688ef995f327.jpg
```

В браузере:
```
https://vapekhv.live/uploads/products/[имя_файла].jpg
```

### 4. Проверить базу данных

```bash
psql -U postgres -d vapekhv_db

-- Проверить категории
SELECT COUNT(*) FROM categories;

-- Проверить товары
SELECT COUNT(*) FROM products;

-- Проверить варианты
SELECT COUNT(*) FROM "ProductVariant";

-- Проверить товары с изображениями
SELECT id, name, "imageUrl", "stockCount" FROM products WHERE "imageUrl" IS NOT NULL LIMIT 5;

-- Выход
\q
```

---

## Troubleshooting

### Ошибка: "npm ERR! code 127 - tsc: command not found"

**Решение:**
```bash
cd ~/shop
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Ошибка: "Permission denied" при создании директории

**Решение:**
```bash
sudo mkdir -p /var/www/vapekhv/uploads/products
sudo chown -R $USER:$USER /var/www/vapekhv/uploads
sudo chmod -R 755 /var/www/vapekhv/uploads
```

### Синхронизация зависает на вариантах

**Проверить:**
```bash
# Смотреть логи
pm2 logs vapekhv-backend --err

# Если видите много таймаутов - проверьте интернет на сервере
ping api.moysklad.ru

# Если видите ошибки 401 - проверьте токен в .env
cat backend/.env | grep MOYSKLAD_TOKEN
```

### Изображения все еще 404

**Проверить:**
```bash
# 1. Проверить переменную окружения
pm2 env 0 | grep UPLOADS_DIR

# 2. Проверить Nginx конфигурацию
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/vapekhv

# 3. Проверить права доступа
ls -la /var/www/vapekhv/uploads/products/
```

### Backend не стартует после обновления

**Решение:**
```bash
# Полная переустановка
cd ~/shop
pm2 delete vapekhv-backend

rm -rf node_modules backend/node_modules frontend/node_modules
npm install

npm run build

pm2 start ecosystem.config.js
pm2 logs vapekhv-backend
```

---

## Что изменилось в коде

### Файлы с изменениями:

1. **backend/src/types/moysklad.types.ts**
   - Добавлен тип `MoySkladReference`
   - Обновлены типы для `image`, `productFolder`, `images`

2. **backend/src/services/moysklad.api.ts**
   - Изменен фильтр вариантов: `productid=${productId}`
   - Добавлен параметр `expand=stock` для вариантов
   - Убраны ошибочные логи

3. **backend/src/services/sync.service.ts**
   - Убран вызов `getVariantStock()` для каждого варианта
   - Остатки берутся напрямую из `msVariant.quantity || msVariant.stock || 0`
   - Добавлено логирование остатков при синхронизации

4. **backend/src/services/image.service.ts**
   - Добавлена поддержка переменной окружения `UPLOADS_DIR`
   - Fallback на дефолтный путь, если не задано

5. **backend/src/config/logger.ts**
   - Добавлена функция `safeStringify()` для безопасной сериализации
   - Исправлен неиспользуемый параметр `_key`

6. **backend/.env.example**
   - Добавлена переменная `UPLOADS_DIR`

---

## Дополнительные команды для отладки

```bash
# Проверить все процессы PM2
pm2 list

# Информация о процессе
pm2 info vapekhv-backend

# Переменные окружения
pm2 env 0

# Перезапуск с новым .env
pm2 restart vapekhv-backend --update-env

# Логи только ошибок
pm2 logs vapekhv-backend --err

# Последние 100 строк логов
pm2 logs vapekhv-backend --lines 100

# Мониторинг ресурсов
pm2 monit

# Очистить логи
pm2 flush
```

---

## Контрольный чеклист

После деплоя проверьте:

- [ ] Backend успешно запустился (`pm2 status`)
- [ ] В логах нет ошибок TypeScript
- [ ] В логах нет ошибок 504 timeout
- [ ] В логах нет circular structure errors
- [ ] Синхронизация категорий прошла успешно
- [ ] Синхронизация товаров прошла успешно
- [ ] Синхронизация вариантов прошла успешно
- [ ] Директория `/var/www/vapekhv/uploads/products/` создана
- [ ] В директории появляются изображения после синхронизации
- [ ] Команда `/sync` в Telegram работает
- [ ] API возвращает товары с изображениями
- [ ] Изображения открываются в браузере (не 404)

---

**Если все пункты выполнены ✅ - интеграция работает корректно!**
