# Миграция: Новые фичи для админки, CRM и клиентского приложения

Дата: 2025-10-18

## Описание изменений

Эта миграция добавляет следующие новые возможности:

### Для Админ-панели:
1. **История изменений заказов** (OrderHistory) - timeline всех изменений
2. **Промокоды** (PromoCode) - система скидочных кодов
3. **Быстрые действия** - копирование, звонки, Telegram ссылки

### Для CRM:
1. **Сегментация клиентов** - VIP, Regular, New, At Risk, Churned
2. **Когортный анализ** - retention rate по месяцам
3. **LTV клиентов** - lifetime value расчет
4. **Топ продукты** - виджет с самыми популярными товарами
5. **Графики** - Recharts вместо простых полосок

### Для Клиентского приложения:
1. **Реферальная программа** - приглашай друзей, получай бонусы
2. **Геймификация** (Achievement) - достижения и награды
3. **История просмотров** (ProductView) - "Вы недавно смотрели"
4. **Сохраненные адреса** (SavedAddress) - быстрый выбор адреса доставки
5. **Уведомления о наличии** (StockNotification) - уведомлю, когда появится товар
6. **Статус-бар заказа** - красивое отображение этапов доставки

## Команды для выполнения НА СЕРВЕРЕ:

### 1. Перейти в директорию backend:
```bash
cd /home/user/shop/backend
```

### 2. Сделать бэкап базы данных (ОБЯЗАТЕЛЬНО!):
```bash
pg_dump -U postgres vapekhv_db > ~/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Применить миграцию Prisma:
```bash
npx prisma migrate dev --name add_new_features
```

### 4. Сгенерировать Prisma Client:
```bash
npx prisma generate
```

### 5. Создать начальные достижения (seeding):
```bash
npx ts-node -e "
import { prisma } from '../src/config/database';

async function seedAchievements() {
  const achievements = [
    {
      title: '🏆 Первая покупка',
      description: 'Сделай свой первый заказ',
      icon: '🏆',
      requirement: 'Оформить первый заказ',
      requirementType: 'FIRST_ORDER',
      requirementValue: 1,
      reward: 50,
      sortOrder: 1,
    },
    {
      title: '🎯 10 заказов',
      description: 'Сделай 10 заказов',
      icon: '🎯',
      requirement: 'Оформить 10 заказов',
      requirementType: 'ORDERS_COUNT',
      requirementValue: 10,
      reward: 200,
      sortOrder: 2,
    },
    {
      title: '💎 VIP клиент',
      description: 'Потрать 50000₽ на покупки',
      icon: '💎',
      requirement: 'Совершить покупок на сумму 50000₽',
      requirementType: 'TOTAL_SPENT',
      requirementValue: 50000,
      reward: 1000,
      sortOrder: 3,
    },
    {
      title: '🔥 Активный покупатель',
      description: 'Закажи 5 раз подряд в течение месяца',
      icon: '🔥',
      requirement: '5 заказов за месяц',
      requirementType: 'ORDERS_IN_ROW',
      requirementValue: 5,
      reward: 300,
      sortOrder: 4,
    },
    {
      title: '👥 Пригласи друзей',
      description: 'Пригласи 3 друзей',
      icon: '👥',
      requirement: 'Пригласить 3 друзей',
      requirementType: 'REFERRALS_COUNT',
      requirementValue: 3,
      reward: 500,
      sortOrder: 5,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { title: achievement.title },
      update: achievement,
      create: achievement,
    });
  }

  console.log('✅ Достижения созданы!');
}

seedAchievements().then(() => process.exit(0));
"
```

### 6. Создать тестовые промокоды:
```bash
npx ts-node -e "
import { prisma } from '../src/config/database';

async function seedPromoCodes() {
  const promoCodes = [
    {
      code: 'WELCOME10',
      type: 'PERCENT',
      value: 10,
      minOrderAmount: 1000,
      validUntil: new Date('2025-12-31'),
      usageLimit: 100,
      description: 'Скидка 10% для новых клиентов (мин. заказ 1000₽)',
    },
    {
      code: 'FREESHIP',
      type: 'FREE_DELIVERY',
      value: 0,
      minOrderAmount: 2000,
      validUntil: new Date('2025-12-31'),
      usageLimit: null,
      description: 'Бесплатная доставка при заказе от 2000₽',
    },
    {
      code: 'SAVE500',
      type: 'FIXED',
      value: 500,
      minOrderAmount: 3000,
      validUntil: new Date('2025-12-31'),
      usageLimit: 50,
      description: 'Скидка 500₽ на заказ от 3000₽',
    },
  ];

  for (const promo of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo,
    });
  }

  console.log('✅ Промокоды созданы!');
}

seedPromoCodes().then(() => process.exit(0));
"
```

### 7. Проверить изменения:
```bash
npx prisma studio
```

## Изменения в schema.prisma:

### Новые модели:

1. **OrderHistory** - история изменений заказов
   - orderId, changedBy, changedByName, field, oldValue, newValue, createdAt

2. **PromoCode** - промокоды
   - code, type (PERCENT/FIXED/FREE_DELIVERY), value, minOrderAmount, validFrom, validUntil, usageLimit, usedCount

3. **Achievement** - достижения
   - title, description, icon, requirementType, requirementValue, reward, sortOrder

4. **UserAchievement** - прогресс пользователей по достижениям
   - userId, achievementId, progress, isCompleted, completedAt

5. **ProductView** - история просмотров товаров
   - userId, productId, viewedAt

6. **SavedAddress** - сохраненные адреса доставки
   - userId, label, address, phone, comment, isDefault, sortOrder

7. **StockNotification** - уведомления о поступлении товара
   - userId, productId, notified, notifiedAt

### Обновления существующих моделей:

**User** (добавлены поля):
- referralCode (String?) - уникальный реферальный код
- referredById (String?) - ID пригласившего пользователя
- Связи: referredBy, referrals[], productViews[], savedAddresses[], userAchievements[], stockNotifications[]

**Product** (добавлены связи):
- productViews[], stockNotifications[]

## После миграции:

1. Перезапустить backend:
```bash
pm2 restart vapekhv-backend
```

2. Проверить логи:
```bash
pm2 logs vapekhv-backend --lines 50
```

3. Проверить, что все работает:
```bash
curl https://vapekhv.live/api/categories
```

## Откат миграции (в случае проблем):

```bash
# Восстановить из бэкапа
psql -U postgres vapekhv_db < ~/backup_before_migration_YYYYMMDD_HHMMSS.sql

# Сгенерировать Prisma Client
npx prisma generate

# Перезапустить backend
pm2 restart vapekhv-backend
```

## Примечания:

- ⚠️ Эта миграция добавляет много новых таблиц, но не изменяет существующие данные
- ✅ Безопасно для существующих заказов и пользователей
- 📊 После миграции в CRM появятся новые аналитические виджеты
- 🎮 Клиенты начнут получать достижения автоматически
- 🎁 Промокоды можно будет применять при оформлении заказа

## Следующие шаги (на MacBook):

После успешной миграции на сервере нужно:
1. ✅ Установить frontend библиотеки (recharts, xlsx, react-csv и др.)
2. ✅ Реализовать новые компоненты в AdminPage и CRM
3. ✅ Добавить новые страницы для клиентов (Достижения, Рефералы и т.д.)
4. ✅ Обновить API endpoints на backend
5. ✅ Запустить `npm run build` и проверить TypeScript
6. ✅ Закоммитить изменения в Git
7. ✅ Запушить на GitHub
8. ✅ На сервере запустить `./deploy.sh`
