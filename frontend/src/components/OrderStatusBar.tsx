import { motion } from 'framer-motion';
import { ShoppingCart, CheckCircle, Package, Truck, Home, XCircle } from 'lucide-react';
import { OrderStatus } from '../api/order';

interface OrderStatusBarProps {
  status: OrderStatus;
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

const getStatusSteps = (status: OrderStatus) => {
  const allSteps = [
    {
      id: 'pending',
      label: 'Оформлен',
      icon: ShoppingCart,
      statuses: [OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING],
    },
    {
      id: 'confirmed',
      label: 'Подтвержден',
      icon: CheckCircle,
      statuses: [OrderStatus.CONFIRMED],
    },
    {
      id: 'processing',
      label: 'Собирается',
      icon: Package,
      statuses: [OrderStatus.PROCESSING],
    },
    {
      id: 'shipped',
      label: 'В пути',
      icon: Truck,
      statuses: [OrderStatus.SHIPPED],
    },
    {
      id: 'delivered',
      label: 'Доставлен',
      icon: Home,
      statuses: [OrderStatus.DELIVERED],
    },
  ];

  // Для отмененных заказов - показываем только первый шаг и отмену
  if (status === OrderStatus.CANCELLED || status === OrderStatus.PAYMENT_EXPIRED) {
    return [
      allSteps[0],
      {
        id: 'cancelled',
        label: status === OrderStatus.PAYMENT_EXPIRED ? 'Оплата истекла' : 'Отменен',
        icon: XCircle,
        statuses: [OrderStatus.CANCELLED, OrderStatus.PAYMENT_EXPIRED],
      },
    ];
  }

  return allSteps;
};

const getActiveStepIndex = (status: OrderStatus, steps: ReturnType<typeof getStatusSteps>) => {
  return steps.findIndex((step) => step.statuses.includes(status));
};

export default function OrderStatusBar({ status, createdAt, confirmedAt, shippedAt, deliveredAt, cancelledAt }: OrderStatusBarProps) {
  const steps = getStatusSteps(status);
  const activeStepIndex = getActiveStepIndex(status, steps);
  const isCancelled = status === OrderStatus.CANCELLED || status === OrderStatus.PAYMENT_EXPIRED;

  const getStepDate = (stepId: string) => {
    switch (stepId) {
      case 'pending':
        return createdAt;
      case 'confirmed':
        return confirmedAt;
      case 'shipped':
        return shippedAt;
      case 'delivered':
        return deliveredAt;
      case 'cancelled':
        return cancelledAt;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full py-6">
      {/* Mobile: Vertical */}
      <div className="block md:hidden space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStepIndex;
          const isPassed = index < activeStepIndex;
          const isFailed = isCancelled && step.id === 'cancelled';
          const stepDate = getStepDate(step.id);

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4"
            >
              {/* Icon */}
              <div className="relative">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isPassed ? 'bg-green-500' : isActive ? 'bg-tg-button' : isFailed ? 'bg-red-500' : 'bg-tg-secondary-bg'}
                  `}
                >
                  <Icon
                    className={`w-6 h-6 ${isPassed || isActive ? 'text-white' : isFailed ? 'text-white' : 'text-tg-hint'}`}
                  />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      absolute left-1/2 top-12 -translate-x-1/2 w-0.5 h-8 transition-all
                      ${isPassed ? 'bg-green-500' : 'bg-tg-secondary-bg'}
                    `}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 pt-2">
                <div
                  className={`
                    text-base font-semibold
                    ${isActive ? 'text-tg-button' : isPassed ? 'text-green-500' : isFailed ? 'text-red-500' : 'text-tg-hint'}
                  `}
                >
                  {step.label}
                </div>
                {stepDate && (
                  <div className="text-xs text-tg-hint mt-1">{formatDate(stepDate)}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop: Horizontal */}
      <div className="hidden md:flex items-center justify-between relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStepIndex;
          const isPassed = index < activeStepIndex;
          const isFailed = isCancelled && step.id === 'cancelled';
          const stepDate = getStepDate(step.id);

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    absolute left-1/2 top-6 w-full h-0.5 transition-all
                    ${isPassed ? 'bg-green-500' : 'bg-tg-secondary-bg'}
                  `}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                className="relative z-10"
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg
                    ${isPassed ? 'bg-green-500' : isActive ? 'bg-tg-button' : isFailed ? 'bg-red-500' : 'bg-tg-secondary-bg'}
                  `}
                >
                  <Icon
                    className={`w-6 h-6 ${isPassed || isActive ? 'text-white' : isFailed ? 'text-white' : 'text-tg-hint'}`}
                  />
                </div>
              </motion.div>

              {/* Label */}
              <div className="mt-3 text-center">
                <div
                  className={`
                    text-sm font-semibold whitespace-nowrap
                    ${isActive ? 'text-tg-button' : isPassed ? 'text-green-500' : isFailed ? 'text-red-500' : 'text-tg-hint'}
                  `}
                >
                  {step.label}
                </div>
                {stepDate && (
                  <div className="text-xs text-tg-hint mt-1">{formatDate(stepDate)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
