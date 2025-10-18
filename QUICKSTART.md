# 🚀 Быстрый старт - Новые фичи VapeKHV

## Что было добавлено?

### ✅ Готовые компоненты (можно использовать сразу):

1. **RevenueChart** - график выручки с Recharts
2. **NewUsersChart** - график новых пользователей
3. **KPICard** - метрики с трендами и sparkline
4. **ExportButton** - экспорт в CSV/Excel/PDF
5. **QuickActions** - быстрые действия на заказе
6. **OrderStatusBar** - статус-бар доставки
7. **CustomerSegmentBadge** - бейджи VIP/Regular/New/At Risk/Churned

### ✅ Обновлена БД схема:
- OrderHistory, PromoCode, Achievement, UserAchievement
- ProductView, SavedAddress, StockNotification
- Реферальная система

---

## 📝 Что нужно сделать дальше?

### 1. Запустить миграцию БД на сервере

```bash
# НА СЕРВЕРЕ (не на MacBook!)
cd /home/user/shop/backend
npx prisma migrate dev --name add_new_features
npx prisma generate
pm2 restart vapekhv-backend
```

Подробные инструкции в файле: `migration-2025-10-18-new-features.md`

### 2. Интегрировать компоненты в AdminPage

Замените простые полоски на графики Recharts:

```tsx
// Вместо полосок для выручки:
import RevenueChart from '../components/charts/RevenueChart';

<RevenueChart
  data={revenueSeries?.points || []}
  interval={crmInterval}
  chartType="area"
  isLoading={isRevenueLoading}
/>
```

```tsx
// Вместо полосок для новых пользователей:
import NewUsersChart from '../components/charts/NewUsersChart';

<NewUsersChart
  data={newUsersSeries?.points || []}
  interval={newUsersInterval}
  isLoading={isNewUsersLoading}
/>
```

### 3. Обновить метрики с трендами

```tsx
import KPICard from '../components/KPICard';
import { TrendingUp } from 'lucide-react';

<KPICard
  label="Выручка (всего)"
  value={formatCurrency(metrics.totalRevenue)}
  subValue={`+${formatCurrency(metrics.revenueRange)} за период`}
  icon={TrendingUp}
  accent="bg-emerald-500/10 text-emerald-400"
  trend={{
    value: 12.5, // процент изменения
    period: "за неделю"
  }}
  sparklineData={[10000, 12000, 15000, 20000, 18000, 22000, 25000]}
/>
```

### 4. Добавить экспорт данных

```tsx
import ExportButton from '../components/ExportButton';

// В секции с заказами:
<ExportButton
  data={filteredOrders}
  filename={`orders-${new Date().toISOString().split('T')[0]}`}
  title="Заказы VapeKHV"
  columns={[
    { key: 'orderNumber', label: '№ Заказа' },
    { key: 'createdAt', label: 'Дата', format: (v) => new Date(v).toLocaleString('ru-RU') },
    { key: 'status', label: 'Статус' },
    { key: 'totalAmount', label: 'Сумма', format: (v) => `${v}₽` },
    { key: 'deliveryAddress', label: 'Адрес' },
    { key: 'deliveryPhone', label: 'Телефон' },
  ]}
/>
```

### 5. Добавить быстрые действия в детальный вид заказа

```tsx
import QuickActions from '../components/QuickActions';

// В expandedOrder блоке:
<QuickActions
  phone={order.deliveryPhone}
  telegramId={order.user.telegramId}
  telegramUsername={order.user.username}
  address={order.deliveryAddress}
  orderItems={order.items.map(item => ({
    name: item.product.name,
    quantity: item.quantity,
    price: item.price,
  }))}
/>
```

### 6. Добавить сегменты клиентов в CRM

```tsx
import CustomerSegmentBadge, { getCustomerSegment } from '../components/CustomerSegmentBadge';

// Для каждого пользователя:
const segment = getCustomerSegment(
  user.totalSpent,
  user.ordersCount,
  daysSinceRegistration,
  daysSinceLastOrder
);

<CustomerSegmentBadge segment={segment} size="md" />
```

### 7. Добавить статус-бар в OrdersPage (для клиента)

```tsx
import OrderStatusBar from '../components/OrderStatusBar';

// В детальном виде заказа клиента:
<OrderStatusBar
  status={order.status}
  createdAt={order.createdAt}
  confirmedAt={order.confirmedAt}
  shippedAt={order.shippedAt}
  deliveredAt={order.deliveredAt}
  cancelledAt={order.cancelledAt}
/>
```

---

## 🔧 Backend задачи (TODO)

### Критично:
1. Создать middleware для записи в OrderHistory при изменении статуса
2. Создать endpoints для промокодов
3. Создать cron job для уведомлений админам (заказы > 1 час)

### Важно:
4. Создать endpoints для достижений
5. Создать endpoints для реферальной программы
6. Создать endpoints для сохраненных адресов
7. Создать endpoints для уведомлений о наличии

### Полезно:
8. Когортный анализ API
9. LTV расчет API
10. Топ продукты API
11. История просмотров API

---

## 🎨 Примеры использования

### Полный пример интеграции в AdminPage:

```tsx
// В секции CRM metrics
<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
  <KPICard
    label="Выручка"
    value={formatCurrency(metrics.totalRevenue)}
    icon={TrendingUp}
    accent="bg-emerald-500/10 text-emerald-400"
    trend={{ value: 15.2, period: "за неделю" }}
    sparklineData={revenueSparkline}
  />

  <KPICard
    label="Пользователи"
    value={metrics.totalUsers}
    icon={Users}
    accent="bg-blue-500/10 text-blue-400"
    trend={{ value: 8.1, period: "за неделю" }}
    sparklineData={usersSparkline}
  />

  {/* ... остальные метрики */}
</div>

{/* Графики */}
<div className="grid xl:grid-cols-2 gap-5">
  <div className="bg-tg-bg rounded-2xl p-5">
    <h3 className="text-lg font-semibold mb-4">Динамика выручки</h3>
    <RevenueChart
      data={revenueSeries?.points || []}
      interval={crmInterval}
      chartType="area"
      isLoading={isRevenueLoading}
    />
  </div>

  <div className="bg-tg-bg rounded-2xl p-5">
    <h3 className="text-lg font-semibold mb-4">Новые пользователи</h3>
    <NewUsersChart
      data={newUsersSeries?.points || []}
      interval={newUsersInterval}
      isLoading={isNewUsersLoading}
    />
  </div>
</div>
```

---

## 📚 Документация компонентов

### RevenueChart

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| data | DataPoint[] | ✅ | Массив точек данных |
| interval | 'daily' \| 'weekly' \| 'monthly' | ✅ | Интервал группировки |
| chartType | 'line' \| 'area' | ❌ | Тип графика (по умолчанию 'area') |
| isLoading | boolean | ❌ | Показать загрузку |

### KPICard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | ✅ | Название метрики |
| value | string \| number | ✅ | Значение |
| icon | LucideIcon | ✅ | Иконка |
| accent | string | ✅ | Tailwind классы цвета |
| trend | { value: number, period: string } | ❌ | Тренд с процентом изменения |
| sparklineData | number[] | ❌ | Данные для мини-графика |
| subValue | string | ❌ | Дополнительное значение |

### ExportButton

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| data | any[] | ✅ | Данные для экспорта |
| filename | string | ✅ | Имя файла без расширения |
| columns | Column[] | ✅ | Конфигурация колонок |
| title | string | ❌ | Заголовок для PDF |

---

**Следующий шаг:** Запустите `npm run build` и проверьте TypeScript!
