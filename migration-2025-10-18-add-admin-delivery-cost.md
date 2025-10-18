# Миграция: Добавление поля `adminDeliveryCost` в модель `Order`

## Команды для выполнения на сервере:

1. Перейти в директорию backend:
   ```bash
   cd backend
   ```

2. Применить миграцию:
   ```bash
   npx prisma migrate dev --name add_admin_delivery_cost_to_order
   ```

3. Сгенерировать Prisma Client:
   ```bash
   npx prisma generate
   ```

4. Проверить изменения:
   ```bash
   npx prisma studio
   ```

## Изменения в схеме:
Добавлено новое поле `adminDeliveryCost` типа `Float?` в модель `Order` для хранения стоимости доставки, установленной администратором.