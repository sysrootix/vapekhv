import { motion } from 'framer-motion';
import { Package, ShoppingBag, Clock, TrendingUp, Calendar, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderApi, OrderStatus } from '../api/order';
import LoadingScreen from '../components/LoadingScreen';

// Функция перевода статуса
const getStatusText = (status: OrderStatus) => {
  const statusMap: Record<OrderStatus, { text: string; color: string }> = {
    [OrderStatus.PENDING_PAYMENT]: { text: 'Ожидает оплаты', color: 'text-orange-500' },
    [OrderStatus.PENDING]: { text: 'Ожидает подтверждения', color: 'text-yellow-500' },
    [OrderStatus.CONFIRMED]: { text: 'Подтверждён', color: 'text-blue-500' },
    [OrderStatus.PROCESSING]: { text: 'Готовится', color: 'text-purple-500' },
    [OrderStatus.SHIPPED]: { text: 'В пути', color: 'text-cyan-500' },
    [OrderStatus.DELIVERED]: { text: 'Доставлен', color: 'text-green-500' },
    [OrderStatus.CANCELLED]: { text: 'Отменён', color: 'text-red-500' },
    [OrderStatus.PAYMENT_EXPIRED]: { text: 'Время оплаты истекло', color: 'text-gray-500' },
  };
  return statusMap[status] || { text: status, color: 'text-tg-hint' };
};

export default function OrdersPage() {
  const navigate = useNavigate();

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/'), [navigate]);
  useTelegramBackButton(handleBack);

  // Загрузка заказов
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: orderApi.getOrders,
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tg-secondary-bg rounded-xl">
              <Package className="w-6 h-6 text-tg-button" />
            </div>
            <h1 className="text-2xl font-bold text-tg-text">Мои заказы</h1>
          </div>
        </motion.div>

        {/* Content */}
        {!orders || orders.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center min-h-[70vh]"
          >
            <div className="text-center px-6 max-w-md">
              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative mx-auto mb-6 w-32 h-32"
              >
                <div className="absolute inset-0 bg-tg-button bg-opacity-10 rounded-full animate-pulse"></div>
                <div className="absolute inset-4 bg-tg-secondary-bg rounded-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-tg-button" />
                </div>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-tg-text mb-3"
              >
                История заказов пуста
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-tg-hint mb-8 leading-relaxed"
              >
                Здесь появятся ваши заказы с актуальной информацией о статусе доставки и истории покупок
              </motion.p>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-3 mb-8"
              >
                <div className="bg-tg-secondary-bg rounded-2xl p-4">
                  <Clock className="w-6 h-6 text-tg-button mx-auto mb-2" />
                  <p className="text-xs text-tg-hint">Отслеживание статуса</p>
                </div>
                <div className="bg-tg-secondary-bg rounded-2xl p-4">
                  <TrendingUp className="w-6 h-6 text-tg-button mx-auto mb-2" />
                  <p className="text-xs text-tg-hint">История покупок</p>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/catalog')}
                className="w-full bg-tg-button text-tg-button-text py-4 px-6 rounded-2xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                Перейти в каталог
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Orders list */
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = getStatusText(order.status);
              const orderDate = new Date(order.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-tg-text">
                        Заказ #{order.orderNumber}
                      </h3>
                      <p className="text-xs text-tg-hint mt-1">{orderDate}</p>
                    </div>
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-tg-hint flex-shrink-0" />
                        <span className="text-tg-text truncate">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="text-tg-hint ml-auto">
                          {(item.price * item.quantity).toLocaleString()}₽
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-tg-hint pl-6">
                        + ещё {order.items.length - 3} товара
                      </p>
                    )}
                  </div>

                  {/* Delivery info */}
                  {order.deliveryAddress && (
                    <div className="border-t border-tg-bg pt-3 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-tg-hint flex-shrink-0 mt-0.5" />
                        <span className="text-tg-hint text-xs">
                          {order.deliveryAddress}
                        </span>
                      </div>
                      {order.deliveryPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-tg-hint flex-shrink-0" />
                          <span className="text-tg-hint text-xs">
                            {order.deliveryPhone}
                          </span>
                        </div>
                      )}
                      {order.deliveryDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-tg-hint flex-shrink-0" />
                          <span className="text-tg-hint text-xs">
                            {new Date(order.deliveryDate).toLocaleDateString('ru-RU')}
                            {order.deliveryTime && `, ${order.deliveryTime}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-tg-bg pt-3 flex items-center justify-between">
                    <span className="text-tg-hint text-sm">Итого:</span>
                    <span className="text-lg font-bold text-tg-text">
                      {order.totalAmount.toLocaleString()}₽
                    </span>
                  </div>

                  {/* Bonus info */}
                  {(order.bonusUsed > 0 || (order.bonusEarned > 0 && order.status === OrderStatus.DELIVERED)) && (
                    <div className="bg-tg-bg rounded-xl p-2 flex items-center justify-between text-xs">
                      {order.bonusUsed > 0 && (
                        <span className="text-orange-500">
                          Использовано бонусов: {order.bonusUsed}
                        </span>
                      )}
                      {order.bonusEarned > 0 && order.status === OrderStatus.DELIVERED && (
                        <span className="text-green-500">
                          Начислено бонусов: {order.bonusEarned}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Payment button if PENDING_PAYMENT */}
                  {order.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => navigate(`/payment/${order.id}`)}
                      className="w-full bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      Оплатить заказ
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

