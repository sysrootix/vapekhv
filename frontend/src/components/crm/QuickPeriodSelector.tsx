import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface PeriodSelection {
  preset: PeriodPreset;
  startDate?: string;
  endDate?: string;
  compareWith?: 'previous' | 'none';
}

interface QuickPeriodSelectorProps {
  value: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
}

export function QuickPeriodSelector({ value, onChange }: QuickPeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  const quickPeriods: Array<{ id: PeriodPreset; label: string }> = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
  ];

  const getPeriodDates = (preset: PeriodPreset): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };
      case 'week':
        return {
          start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        };
      default:
        return { start: today, end: today };
    }
  };

  const handlePresetClick = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      setShowCustom(!showCustom);
      return;
    }
    const dates = getPeriodDates(preset);
    onChange({
      preset,
      startDate: dates.start.toISOString().split('T')[0],
      endDate: dates.end.toISOString().split('T')[0],
      compareWith: value.compareWith || 'previous',
    });
    setShowCustom(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quickPeriods.map((period) => (
        <button
          key={period.id}
          onClick={() => handlePresetClick(period.id)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
            ${value.preset === period.id
              ? 'bg-tg-button text-tg-button-text shadow-md'
              : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
            }
          `}
        >
          {period.label}
        </button>
      ))}
      
      <div className="relative">
        <button
          onClick={() => handlePresetClick('custom')}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${value.preset === 'custom'
              ? 'bg-tg-button text-tg-button-text shadow-md'
              : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
            }
          `}
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Произвольный</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
        </button>

        {showCustom && (
          <div className="absolute top-full left-0 mt-2 bg-tg-secondary-bg rounded-xl p-4 shadow-lg border border-tg-button/20 z-50 min-w-[280px]">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-tg-text">Выберите период</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-tg-hint block mb-1">От</label>
                  <input
                    type="date"
                    value={value.startDate || ''}
                    onChange={(e) => onChange({ ...value, startDate: e.target.value, preset: 'custom' })}
                    className="w-full px-3 py-2 rounded-lg bg-tg-bg text-tg-text text-sm border-2 border-transparent focus:border-tg-button focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-tg-hint block mb-1">До</label>
                  <input
                    type="date"
                    value={value.endDate || ''}
                    onChange={(e) => onChange({ ...value, endDate: e.target.value, preset: 'custom' })}
                    className="w-full px-3 py-2 rounded-lg bg-tg-bg text-tg-text text-sm border-2 border-transparent focus:border-tg-button focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange({ ...value, compareWith: 'previous' })}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${value.compareWith === 'previous'
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-bg text-tg-hint'
                    }
                  `}
                >
                  Сравнить с предыдущим
                </button>
                <button
                  onClick={() => onChange({ ...value, compareWith: 'none' })}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${value.compareWith === 'none'
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-bg text-tg-hint'
                    }
                  `}
                >
                  Без сравнения
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

