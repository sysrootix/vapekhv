# Миграция: Stock Notifications (Уведомления о наличии товара)

## Описание изменений

Эта миграция проверяет и создает (если нужно) таблицу `stock_notifications` для функции уведомлений о поступлении товара.

Модель уже описана в `backend/prisma/schema.prisma` (строки 402-417), но эта миграция нужна для применения изменений в базе данных на продакшн сервере.

## Команды для выполнения на сервере:

### 1. Перейти в директорию backend:
```bash
cd /home/user/shop/backend
```

### 2. Проверить текущее состояние БД:
```bash
npx prisma migrate status
```

### 3. Если миграция нужна - создать и применить:
```bash
npx prisma migrate deploy
```

**Альтернативно** (если нужно создать новую миграцию с именем):
```bash
npx prisma migrate dev --name add_stock_notifications
```

### 4. Проверить изменения:
```bash
npx prisma studio
```
Откроется веб-интерфейс для проверки таблиц.

### 5. Сгенерировать Prisma Client:
```bash
npx prisma generate
```

### 6. Перезапустить backend:
```bash
pm2 restart vapekhv-backend
```

## Изменения в schema.prisma:

### Новая модель: StockNotification
```prisma
model StockNotification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  notified  Boolean  @default(false)
  createdAt DateTime @default(now())
  notifiedAt DateTime?

  @@map("stock_notifications")
  @@unique([userId, productId])
  @@index([userId])
  @@index([productId])
  @@index([notified])
}
```

### Обновления в модели User:
```prisma
model User {
  // ...
  stockNotifications StockNotification[]
  // ...
}
```

### Обновления в модели Product:
```prisma
model Product {
  // ...
  stockNotifications StockNotification[]
  // ...
}
```

## Новые API endpoints:

### Подписка на уведомление:
```
POST /products/:productId/notify
Authorization: Bearer {token}
```

### Отписка от уведомления:
```
DELETE /products/:productId/notify
Authorization: Bearer {token}
```

### Проверка подписки:
```
GET /products/:productId/notify/check
Authorization: Bearer {token}
Response: { "subscribed": boolean }
```

## Функциональность:

1. **Подписка**: Пользователь может подписаться на уведомление о поступлении товара, которого нет в наличии
2. **Проверка**: При попытке подписки проверяется, что товар действительно отсутствует
3. **Уникальность**: Один пользователь может иметь только одну подписку на товар (unique constraint)
4. **Cron job** (TODO): Нужно будет создать фоновую задачу, которая:
   - Периодически проверяет товары, на которые есть подписки
   - Если товар поступил в наличие - отправляет уведомление в Telegram
   - Помечает уведомление как отправленное (`notified = true`, `notifiedAt = now()`)

## Проверка работоспособности:

### 1. Проверить что таблица создана:
```bash
psql -U postgres -d vapekhv_db
\dt stock_notifications
\d stock_notifications
```

### 2. Тестовый запрос (через API):
```bash
# Получить товар без наличия
curl https://vapekhv.ru/api/products/{productId}

# Подписаться на уведомление
curl -X POST https://vapekhv.ru/api/products/{productId}/notify \
  -H "Authorization: Bearer {token}"

# Проверить подписку
curl https://vapekhv.ru/api/products/{productId}/notify/check \
  -H "Authorization: Bearer {token}"
```

## Откат миграции (если что-то пошло не так):

```bash
# Откатить последнюю миграцию
npx prisma migrate resolve --rolled-back {migration_name}

# Удалить таблицу вручную (крайний случай)
psql -U postgres -d vapekhv_db
DROP TABLE IF EXISTS stock_notifications CASCADE;
```

---

**Дата создания**: 2025-10-19
**Статус**: Готов к применению на сервере
**Backend API**: ✅ Готов
**Frontend API**: ✅ Готов
**Frontend UI**: ⚠️ Требует добавления кнопки в ProductDetailPage
