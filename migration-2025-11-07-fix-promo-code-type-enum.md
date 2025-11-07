# Миграция: Исправление enum PromoCodeType

## Описание проблемы
При создании заказа с промокодом возникала ошибка:
```
column "promoCodeType" is of type promo_code_type but expression is of type "PromoCodeType"
```

Проблема была в несоответствии имени enum в Prisma схеме и PostgreSQL. PostgreSQL использует имя `promo_code_type` (lowercase с подчеркиваниями), а Prisma пыталась использовать `PromoCodeType`.

## Изменения в schema.prisma

Добавлены атрибуты `@map` для каждого значения enum и `@@map("promo_code_type")` для самого enum:

```prisma
enum PromoCodeType {
  PERCENT       @map("PERCENT")
  FIXED         @map("FIXED")
  FREE_DELIVERY @map("FREE_DELIVERY")
  BONUS         @map("BONUS")

  @@map("promo_code_type")
}
```

## Команды для выполнения на сервере:

### 1. Перейти в директорию backend:
```bash
cd /root/shop/backend
```

### 2. Сгенерировать Prisma Client с новыми настройками:
```bash
npx prisma generate
```

### 3. Пересобрать backend:
```bash
cd /root/shop
npm run build:backend
```

### 4. Перезапустить backend через PM2:
```bash
pm2 restart vapekhv-backend
```

### 5. Проверить логи:
```bash
pm2 logs vapekhv-backend --lines 50
```

## Примечание
Миграция базы данных НЕ требуется, так как enum в PostgreSQL уже создан с правильным именем `promo_code_type`. Мы просто добавили маппинг в Prisma схеме, чтобы она знала об этом имени.

## Проверка
После выполнения команд попробуйте создать заказ с промокодом. Ошибка больше не должна появляться.
