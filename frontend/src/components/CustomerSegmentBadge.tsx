import { motion } from 'framer-motion';

export type CustomerSegment = 'VIP' | 'REGULAR' | 'NEW' | 'AT_RISK' | 'CHURNED' | 'NONE';

interface CustomerSegmentBadgeProps {
  segment: CustomerSegment;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const segmentConfig: Record<CustomerSegment, { badge: string; label: string; color: string; bgColor: string }> = {
  VIP: {
    badge: '👑 VIP',
    label: 'VIP клиент',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  REGULAR: {
    badge: '⭐ Постоянный',
    label: 'Постоянный клиент',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  NEW: {
    badge: '🆕 Новичок',
    label: 'Новый клиент',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  AT_RISK: {
    badge: '⚠️ Неактивный',
    label: 'Неактивный клиент',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  CHURNED: {
    badge: '💤 Ушел',
    label: 'Потерянный клиент',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  NONE: {
    badge: 'Клиент',
    label: 'Обычный клиент',
    color: 'text-tg-hint',
    bgColor: 'bg-tg-secondary-bg border-transparent',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function CustomerSegmentBadge({ segment, size = 'md', showLabel = false }: CustomerSegmentBadgeProps) {
  const config = segmentConfig[segment];

  if (segment === 'NONE') return null;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center rounded-full font-semibold border
        ${config.color} ${config.bgColor} ${sizeClasses[size]}
      `}
      title={showLabel ? config.label : undefined}
    >
      {showLabel ? config.label : config.badge}
    </motion.span>
  );
}

// Функция для определения сегмента клиента
export function getCustomerSegment(
  totalSpent: number,
  ordersCount: number,
  daysSinceRegistration: number,
  daysSinceLastOrder: number | null
): CustomerSegment {
  // VIP: потратил > 50000₽ или сделал > 20 заказов
  if (totalSpent > 50000 || ordersCount > 20) {
    return 'VIP';
  }

  // Постоянный: потратил > 10000₽ и сделал >= 5 заказов
  if (totalSpent > 10000 && ordersCount >= 5) {
    return 'REGULAR';
  }

  // Новичок: сделал < 3 заказов и зарегистрирован < 30 дней
  if (ordersCount < 3 && daysSinceRegistration < 30) {
    return 'NEW';
  }

  // Ушедший: последний заказ > 180 дней назад
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 180) {
    return 'CHURNED';
  }

  // Неактивный: последний заказ > 60 дней назад и раньше делал >= 3 заказа
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 60 && ordersCount >= 3) {
    return 'AT_RISK';
  }

  return 'NONE';
}
