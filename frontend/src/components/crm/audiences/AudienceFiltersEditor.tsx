import { AudienceFilters } from '../../../api/admin';

interface AudienceFiltersEditorProps {
  value: AudienceFilters;
  onChange: (value: AudienceFilters) => void;
}

const numberInputClasses =
  'w-full px-3 py-2 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all text-sm';

const selectClasses =
  'w-full px-3 py-2 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none text-sm';

const booleanOptions = [
  { label: 'Любые', value: 'any' },
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

export function AudienceFiltersEditor({ value, onChange }: AudienceFiltersEditorProps) {
  const filters = value || {};

  const updateFilter = (key: keyof AudienceFilters, nextValue: any) => {
    const nextFilters: AudienceFilters = { ...filters };
    if (
      nextValue === undefined ||
      nextValue === null ||
      (typeof nextValue === 'string' && nextValue.trim() === '')
    ) {
      delete nextFilters[key];
    } else {
      (nextFilters as any)[key] = nextValue;
    }
    onChange(nextFilters);
  };

  const handleNumberChange = (key: keyof AudienceFilters, raw: string) => {
    if (raw === '') {
      updateFilter(key, undefined);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateFilter(key, parsed);
  };

  const handleBooleanChange = (key: keyof AudienceFilters, raw: string) => {
    if (raw === 'any') {
      updateFilter(key, undefined);
    } else {
      updateFilter(key, raw === 'true');
    }
  };

  const getNumericValue = (key: keyof AudienceFilters): string | number => {
    const value = filters[key];
    return typeof value === 'number' ? value : '';
  };

  const renderRangeInputs = (
    label: string,
    minKey: keyof AudienceFilters,
    maxKey: keyof AudienceFilters,
    suffix?: string
  ) => (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-tg-text">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-tg-hint mb-1">От{suffix ? `, ${suffix}` : ''}</div>
          <input
            type="number"
            min={0}
            step="1"
            value={getNumericValue(minKey)}
            onChange={(e) => handleNumberChange(minKey, e.target.value)}
            className={numberInputClasses}
          />
        </div>
        <div>
          <div className="text-xs text-tg-hint mb-1">До{suffix ? `, ${suffix}` : ''}</div>
          <input
            type="number"
            min={0}
            step="1"
            value={getNumericValue(maxKey)}
            onChange={(e) => handleNumberChange(maxKey, e.target.value)}
            className={numberInputClasses}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-tg-text">Telegram ID (через запятую)</label>
          <input
            type="text"
            value={filters.telegramIds?.join(', ') ?? ''}
            onChange={(e) => {
              const ids = e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
              updateFilter('telegramIds', ids.length ? ids : undefined);
            }}
            placeholder="123456789, 987654321"
            className={numberInputClasses}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-tg-text">Username содержит</label>
          <input
            type="text"
            value={filters.usernameContains ?? ''}
            onChange={(e) => updateFilter('usernameContains', e.target.value)}
            placeholder="@username"
            className={numberInputClasses}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div className="text-sm font-semibold text-tg-text mb-2">Есть покупки</div>
          <select
            value={
              filters.hasOrders === undefined ? 'any' : filters.hasOrders ? 'true' : 'false'
            }
            onChange={(e) => handleBooleanChange('hasOrders', e.target.value)}
            className={selectClasses}
          >
            {booleanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-sm font-semibold text-tg-text mb-2">Есть телефон</div>
          <select
            value={
              filters.hasPhone === undefined ? 'any' : filters.hasPhone ? 'true' : 'false'
            }
            onChange={(e) => handleBooleanChange('hasPhone', e.target.value)}
            className={selectClasses}
          >
            {booleanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-sm font-semibold text-tg-text mb-2">Есть username</div>
          <select
            value={
              filters.hasTelegramUsername === undefined
                ? 'any'
                : filters.hasTelegramUsername
                  ? 'true'
                  : 'false'
            }
            onChange={(e) => handleBooleanChange('hasTelegramUsername', e.target.value)}
            className={selectClasses}
          >
            {booleanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-sm font-semibold text-tg-text mb-2">Telegram Premium</div>
          <select
            value={
              filters.isPremium === undefined ? 'any' : filters.isPremium ? 'true' : 'false'
            }
            onChange={(e) => handleBooleanChange('isPremium', e.target.value)}
            className={selectClasses}
          >
            {booleanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {renderRangeInputs('Бонусные баллы', 'bonusPointsMin', 'bonusPointsMax', 'шт')}
        {renderRangeInputs('Суммарные траты', 'totalSpentMin', 'totalSpentMax', '₽')}
        {renderRangeInputs('Количество заказов', 'ordersCountMin', 'ordersCountMax', 'шт')}
        {renderRangeInputs('Дней с последней покупки', 'daysSinceLastOrderMin', 'daysSinceLastOrderMax', 'дней')}
        {renderRangeInputs('Дней с последнего входа', 'daysSinceLastLoginMin', 'daysSinceLastLoginMax', 'дней')}
        {renderRangeInputs('Возраст аккаунта', 'daysSinceRegistrationMin', 'daysSinceRegistrationMax', 'дней')}
      </div>
    </div>
  );
}
