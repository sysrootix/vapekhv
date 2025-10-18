# Миграция: Интеграция с МойСклад и исправление adminDeliveryCost

## Команды для выполнения на сервере:

1.  Перейти в директорию backend:
    ```bash
    cd backend
    ```
2.  Установить зависимости (если необходимо):
    ```bash
    npm install
    ```
3.  Собрать проект для проверки TypeScript и линтинга:
    ```bash
    npm run build
    npm run lint
    ```
4.  Перезапустить PM2 процесс для бэкенда:
    ```bash
    pm2 restart vapekhv-backend
    ```

## Изменения в коде:

1.  **backend/src/controllers/admin.controller.ts**: Исправлена логика обновления `adminDeliveryCost` и статуса заказа, чтобы избежать перезаписи. Теперь обновление `adminDeliveryCost` и статуса происходит в одной транзакции.
2.  **backend/src/services/moysklad.api.ts**: Добавлен метод `createCustomerOrder` для создания заказов покупателей в МойСклад.
3.  **backend/src/controllers/order.controller.ts**: В метод `confirmPayment` добавлена логика создания заказа в МойСклад после подтверждения оплаты.

## Важные TODOs:

В файле `backend/src/controllers/order.controller.ts` есть следующие `TODO`s, которые необходимо заменить на актуальные значения из вашего аккаунта МойСклад:

*   Замените `YOUR_ORGANIZATION_ID` на ID вашей организации в МойСклад:
    ```typescript
    href: 'https://api.moysklad.ru/api/remap/1.2/entity/organization/YOUR_ORGANIZATION_ID',
    ```
*   Замените `YOUR_COUNTERPARTY_ID` на ID контрагента по умолчанию или реализуйте логику создания нового контрагента, если его нет:
    ```typescript
    href: 'https://api.moysklad.ru/api/remap/1.2/entity/counterparty/YOUR_COUNTERPARTY_ID',
    ```
*   Реализуйте логику для обработки вариантов товаров (модификаций) вместо простого `productId`:
    ```typescript
    href: `https://api.moysklad.ru/api/remap/1.2/entity/product/${item.productId}`, // TODO: Handle variants
    ```

После выполнения этих шагов, функциональность обновления `adminDeliveryCost` и создания заказов в МойСклад должна работать корректно.
