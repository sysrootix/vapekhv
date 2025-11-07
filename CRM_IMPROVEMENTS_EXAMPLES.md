# 💻 Примеры реализации улучшений CRM

## 1. Навигация по секциям (Tabs)

```tsx
// components/CrmTabs.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

type TabId = 'overview' | 'users' | 'analytics';

export function CrmTabs({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const tabs = [
    { id: 'overview' as TabId, label: 'Обзор', icon: BarChart3 },
    { id: 'users' as TabId, label: 'Пользователи', icon: Users },
    { id: 'analytics' as TabId, label: 'Аналитика', icon: TrendingUp },
  ];

  return (
    <div className="sticky top-0 z-40 bg-tg-secondary-bg border-b border-tg-button/10">
      <div className="flex gap-1 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                ${isActive 
                  ? 'bg-tg-button text-tg-button-text shadow-lg' 
                  : 'text-tg-hint hover:bg-tg-bg'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## 2. Упрощенный выбор периода

```tsx
// components/QuickPeriodSelector.tsx
import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';

type QuickPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function QuickPeriodSelector({ 
  value, 
  onChange 
}: { 
  value: PeriodSelection; 
  onChange: (period: PeriodSelection) => void 
}) {
  const [showCustom, setShowCustom] = useState(false);

  const quickPeriods: Array<{ id: QuickPeriod; label: string }> = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
  ];

  return (
    <div className="flex items-center gap-2">
      {quickPeriods.map((period) => (
        <button
          key={period.id}
          onClick={() => onChange({ preset: period.id as PeriodPreset, compareWith: 'previous' })}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${value.preset === period.id
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
            }
          `}
        >
          {period.label}
        </button>
      ))}
      
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80"
      >
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Произвольный</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
      </button>

      {showCustom && (
        <div className="absolute top-full mt-2 bg-tg-secondary-bg rounded-xl p-4 shadow-lg border border-tg-button/20">
          {/* Custom date picker */}
        </div>
      )}
    </div>
  );
}
```

## 3. Модальное окно с табами

```tsx
// components/UserDetailsModal.tsx
import { useState } from 'react';
import { User, Package, Gift, Edit } from 'lucide-react';

type TabId = 'overview' | 'orders' | 'bonuses' | 'edit';

export function UserDetailsModal({ user, onClose }: { user: CrmUserDetails; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs = [
    { id: 'overview' as TabId, label: 'Обзор', icon: User },
    { id: 'orders' as TabId, label: 'Заказы', icon: Package },
    { id: 'bonuses' as TabId, label: 'Бонусы', icon: Gift },
    { id: 'edit' as TabId, label: 'Редактировать', icon: Edit },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-tg-secondary-bg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-tg-button/10">
          <h2 className="text-2xl font-bold text-tg-text">{user.user.name || `#${user.user.telegramId}`}</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-tg-button/10 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${isActive 
                    ? 'border-tg-button text-tg-button' 
                    : 'border-transparent text-tg-hint hover:text-tg-text'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'orders' && <OrdersTab orders={user.recentOrders} />}
          {activeTab === 'bonuses' && <BonusesTab history={user.bonusHistory} />}
          {activeTab === 'edit' && <EditTab user={user} />}
        </div>
      </div>
    </div>
  );
}
```

## 4. Фильтры пользователей

```tsx
// components/UserFilters.tsx
import { Filter, X } from 'lucide-react';
import { useState } from 'react';

type FilterType = {
  segment?: 'vip' | 'new' | 'inactive';
  revenueRange?: { min: number; max: number };
  lastOrderDays?: number;
};

export function UserFilters({ 
  filters, 
  onChange, 
  onReset 
}: { 
  filters: FilterType; 
  onChange: (filters: FilterType) => void;
  onReset: () => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${hasActiveFilters
            ? 'bg-tg-button text-tg-button-text'
            : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        Фильтры
        {hasActiveFilters && (
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {Object.keys(filters).length}
          </span>
        )}
      </button>

      {showFilters && (
        <div className="absolute top-full mt-2 right-0 bg-tg-secondary-bg rounded-xl p-4 shadow-lg border border-tg-button/20 min-w-[280px] z-10">
          <div className="space-y-4">
            {/* Segment filter */}
            <div>
              <label className="text-xs text-tg-hint mb-2 block">Сегмент</label>
              <select
                value={filters.segment || ''}
                onChange={(e) => onChange({ ...filters, segment: e.target.value as any || undefined })}
                className="w-full px-3 py-2 bg-tg-bg rounded-lg text-tg-text text-sm"
              >
                <option value="">Все</option>
                <option value="vip">VIP клиенты</option>
                <option value="new">Новые пользователи</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>

            {/* Revenue range */}
            <div>
              <label className="text-xs text-tg-hint mb-2 block">Выручка</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="От"
                  value={filters.revenueRange?.min || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    revenueRange: { 
                      min: Number(e.target.value) || undefined, 
                      max: filters.revenueRange?.max 
                    }
                  })}
                  className="flex-1 px-3 py-2 bg-tg-bg rounded-lg text-tg-text text-sm"
                />
                <input
                  type="number"
                  placeholder="До"
                  value={filters.revenueRange?.max || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    revenueRange: { 
                      min: filters.revenueRange?.min, 
                      max: Number(e.target.value) || undefined 
                    }
                  })}
                  className="flex-1 px-3 py-2 bg-tg-bg rounded-lg text-tg-text text-sm"
                />
              </div>
            </div>

            {/* Last order */}
            <div>
              <label className="text-xs text-tg-hint mb-2 block">Последний заказ</label>
              <select
                value={filters.lastOrderDays || ''}
                onChange={(e) => onChange({ 
                  ...filters, 
                  lastOrderDays: Number(e.target.value) || undefined 
                })}
                className="w-full px-3 py-2 bg-tg-bg rounded-lg text-tg-text text-sm"
              >
                <option value="">Любое время</option>
                <option value="7">За последние 7 дней</option>
                <option value="30">За последние 30 дней</option>
                <option value="90">За последние 90 дней</option>
                <option value="365">За последний год</option>
              </select>
            </div>

            {/* Reset button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  onReset();
                  setShowFilters(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-tg-bg text-tg-text rounded-lg text-sm font-medium hover:bg-opacity-80"
              >
                <X className="w-4 h-4" />
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 5. Улучшенная пагинация

```tsx
// components/ImprovedPagination.tsx
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function ImprovedPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageInput = (value: string) => {
    setPageInput(value);
    const page = Number(value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-tg-button/10">
      <div className="text-sm text-tg-hint">
        Показано <span className="font-semibold text-tg-text">{startItem}-{endItem}</span> из{' '}
        <span className="font-semibold text-tg-text">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-opacity-80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-tg-hint">Страница</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => handlePageInput(pageInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePageInput(pageInput);
              }
            }}
            className="w-16 px-3 py-2 rounded-xl bg-tg-secondary-bg text-tg-text text-sm text-center border-2 border-transparent focus:border-tg-button focus:outline-none"
          />
          <span className="text-sm text-tg-hint">из {totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-opacity-80 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

## 6. Skeleton Loading

```tsx
// components/CrmSkeleton.tsx
export function MetricCardSkeleton() {
  return (
    <div className="bg-tg-bg rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 bg-tg-secondary-bg rounded-xl" />
        <div className="w-20 h-6 bg-tg-secondary-bg rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="w-24 h-4 bg-tg-secondary-bg rounded" />
        <div className="w-32 h-8 bg-tg-secondary-bg rounded" />
      </div>
      <div className="pt-2 border-t border-tg-secondary-bg/50">
        <div className="w-40 h-4 bg-tg-secondary-bg rounded" />
      </div>
    </div>
  );
}

export function UserListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-tg-secondary-bg rounded-2xl p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-tg-bg rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-32 h-5 bg-tg-bg rounded" />
              <div className="w-48 h-4 bg-tg-bg rounded" />
            </div>
            <div className="w-20 h-6 bg-tg-bg rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 7. Индикатор важных событий

```tsx
// components/ImportantEventsBadge.tsx
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

export function ImportantEventsBadge({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || count === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <div className="bg-red-500 text-white rounded-xl p-4 shadow-lg flex items-center gap-3 min-w-[200px]">
        <Bell className="w-5 h-5" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Новые события</div>
          <div className="text-xs opacity-90">
            {count} {count === 1 ? 'новый заказ' : 'новых заказов'}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

## 8. Упрощенные карточки метрик с деталями по hover

```tsx
// components/SimplifiedMetricCard.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SimplifiedMetricCard({
  label,
  value,
  icon: Icon,
  accent,
  details,
}: {
  label: string;
  value: string;
  icon: any;
  accent: string;
  details?: React.ReactNode;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="bg-tg-bg rounded-2xl p-5 relative"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex items-center justify-center ${accent} rounded-xl p-2`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-tg-hint mb-1">{label}</p>
        <p className="text-2xl font-bold text-tg-text">{value}</p>
      </div>

      <AnimatePresence>
        {showDetails && details && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-tg-secondary-bg rounded-xl p-4 shadow-lg border border-tg-button/20 z-10"
          >
            {details}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

