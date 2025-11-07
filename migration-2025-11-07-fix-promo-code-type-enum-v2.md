# Миграция: Исправление enum PromoCodeType (v2)

## Проблема
Ошибка сохраняется даже после добавления `@@map`. Проблема в том, что PostgreSQL enum был создан с именем `promo_code_type`, но Prisma отправляет значения как `"PERCENT"`, `"FIXED"`, etc., в то время как PostgreSQL ожидает точное соответствие.

## Решение

Нужно проверить существующий enum в PostgreSQL и при необходимости пересоздать его.

## Команды для выполнения на сервере:

### 1. Подключиться к PostgreSQL:
```bash
psql -U postgres -d vapekhv_db
```

### 2. Проверить существующий enum:
```sql
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'promo_code_type' OR typname = 'PromoCodeType';
```

### 3. Если enum существует с неправильными значениями, удалить и пересоздать:

**ВАЖНО: Сначала нужно сохранить данные!**

```sql
-- Создать временную колонку
ALTER TABLE orders ADD COLUMN promo_code_type_temp TEXT;

-- Скопировать данные
UPDATE orders SET promo_code_type_temp = "promoCodeType"::TEXT;

-- Удалить старую колонку
ALTER TABLE orders DROP COLUMN "promoCodeType";

-- Удалить старый enum
DROP TYPE IF EXISTS promo_code_type CASCADE;
DROP TYPE IF EXISTS "PromoCodeType" CASCADE;

-- Создать новый enum с правильными значениями
CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT', 'FIXED', 'FREE_DELIVERY', 'BONUS');

-- Создать колонку с новым типом
ALTER TABLE orders ADD COLUMN "promoCodeType" "PromoCodeType";

-- Восстановить данные
UPDATE orders SET "promoCodeType" = promo_code_type_temp::"PromoCodeType" WHERE promo_code_type_temp IS NOT NULL;

-- Удалить временную колонку
ALTER TABLE orders DROP COLUMN promo_code_type_temp;

-- Выйти из psql
\q
```

### 4. Обновить Prisma Client и пересобрать:
```bash
cd /root/shop/backend
npx prisma db pull  # Обновить схему из БД
npx prisma generate # Сгенерировать клиент
cd /root/shop
npm run build:backend
pm2 restart vapekhv-backend
```

## Альтернативное решение (если данных в проблемных заказах нет):

Если в таблице `orders` нет записей с заполненным `promoCodeType`, можно просто:

```sql
-- В psql
ALTER TABLE orders DROP COLUMN "promoCodeType";
DROP TYPE IF EXISTS promo_code_type CASCADE;
DROP TYPE IF EXISTS "PromoCodeType" CASCADE;
CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT', 'FIXED', 'FREE_DELIVERY', 'BONUS');
ALTER TABLE orders ADD COLUMN "promoCodeType" "PromoCodeType";
\q
```

Затем:
```bash
cd /root/shop/backend
npx prisma generate
cd /root/shop
npm run build:backend
pm2 restart vapekhv-backend
```
