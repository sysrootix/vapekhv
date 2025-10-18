# Миграция: Добавление колонки actualDeliveryCost

## Описание изменений

Добавлена новая колонка `actualDeliveryCost` в таблицу `orders` для хранения фактической стоимости такси, которую указывает админ при передаче заказа курьеру.

### Разница между колонками:
- **deliveryCost** - стоимость доставки для клиента (показывается в заказе)
- **actualDeliveryCost** - фактическая стоимость такси, которую оплатил админ (для внутренней аналитики)

## Команды для выполнения на сервере:

### 1. Перейти в директорию backend:
```bash
cd /home/user/shop/backend
```

### 2. Применить миграцию:
```bash
npx prisma migrate dev --name add_actual_delivery_cost
```

### 3. Сгенерировать Prisma Client:
```bash
npx prisma generate
```

### 4. Проверить изменения (опционально):
```bash
npx prisma studio
```

## Изменения в schema.prisma:

Добавлена строка:
```prisma
actualDeliveryCost Float?    // Фактическая стоимость такси (указывает админ)
```

В модель `Order` после поля `deliveryCost`.

## Влияние на код:

- Backend: обновлен метод `updateOrderStatus` в `adminController.ts` для записи в `actualDeliveryCost`
- Frontend: модальное окно в `AdminPage.tsx` теперь записывает стоимость в правильное поле
- Тип данных: `Float?` (nullable), т.к. не все заказы имеют доставку

## После миграции:

1. Перезапустить backend:
```bash
pm2 restart vapekhv-backend
```

2. Проверить логи:
```bash
pm2 logs vapekhv-backend --lines 50
```
