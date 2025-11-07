import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Check, X, CloudRain } from 'lucide-react';
import { useEffect } from 'react';
import { DELIVERY_STEPS } from '../utils/shipping';

interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentDeliveryCost: number;
  badWeather?: boolean;
  weatherMessage?: string | null;
}

export default function DeliveryInfoModal({
  isOpen,
  onClose,
  subtotal,
  currentDeliveryCost,
  badWeather = false,
  weatherMessage = null,
}: DeliveryInfoModalProps) {
  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl p-6 z-[110] safe-bottom max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-tg-text">Тарифы доставки</h3>
                  <p className="text-xs text-tg-hint">По г. Хабаровск</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-tg-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-tg-hint" />
              </button>
            </div>

            {/* Предупреждение о погоде */}
            {badWeather && weatherMessage && (
              <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-3 flex items-start gap-3 mb-4">
                <div className="p-1.5 bg-orange-500 rounded-lg flex-shrink-0">
                  <CloudRain className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-200">
                    {weatherMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Тарифы */}
            <div className="space-y-2 mb-6">
              {DELIVERY_STEPS.map((step, index) => {
                const isReached = subtotal >= step.threshold;
                const isCurrent = isReached && (index === DELIVERY_STEPS.length - 1 || subtotal < DELIVERY_STEPS[index + 1]?.threshold);
                
                // Применяем множитель при плохой погоде (только для платной доставки)
                const displayCost = badWeather && step.cost > 0 
                  ? Math.ceil(step.cost * 1.2) 
                  : step.cost;
                
                // Формируем лейбл с учетом увеличенной цены
                let displayLabel: string = step.label;
                if (badWeather && step.cost > 0) {
                  // Заменяем цену в лейбле (формат: "Доставка за 700₽" -> "Доставка за 840₽")
                  displayLabel = step.label.replace(
                    /\d+₽/,
                    `${displayCost.toLocaleString('ru-RU')}₽`
                  );
                }
                
                return (
                  <div
                    key={step.threshold}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-green-500/15 border-2 border-green-500/40'
                        : isReached
                        ? 'bg-green-500/8 border border-green-500/20'
                        : 'bg-tg-bg border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isReached ? (
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-tg-bg border-2 border-tg-hint flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] text-tg-hint font-bold">{index + 1}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${
                            isCurrent ? 'text-green-500' : isReached ? 'text-green-600' : 'text-tg-text'
                          }`}>
                            {displayLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-semibold whitespace-nowrap">
                              АКТИВНО
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-tg-hint mt-0.5 block">
                          от {step.threshold.toLocaleString('ru-RU')}₽
                        </span>
                      </div>
                    </div>
                    {!isReached && (
                      <div className="text-xs text-tg-hint font-semibold whitespace-nowrap ml-2">
                        +{Math.max(0, step.threshold - subtotal).toLocaleString('ru-RU')}₽
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Текущий статус */}
            <div className="bg-tg-bg rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tg-hint">Ваша текущая доставка:</span>
                <span className={`text-lg font-bold ${
                  currentDeliveryCost === 0 ? 'text-green-500' : 'text-tg-text'
                }`}>
                  {currentDeliveryCost === 0 ? 'Бесплатно 🎉' : `${currentDeliveryCost.toLocaleString('ru-RU')}₽`}
                </span>
              </div>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={onClose}
              className="w-full mt-6 bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Понятно
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

