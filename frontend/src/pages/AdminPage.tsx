import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Filter,
  Clock,
  CheckCircle,
  Truck,
  Home,
  XCircle,
  User,
  MapPin,
  Phone,
  Calendar,
  ChevronDown,
  Loader2,
  Search,
  MessageCircle,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '../api/order';
import { adminApi } from '../api/admin';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';

// Статусы и их отображение
const statusConfig = {
  ALL: { text: 'Все', icon: Package, color: 'text-tg-text' },
  PENDING_PAYMENT: { text: 'Ожидает оплаты', icon: Clock, color: 'text-orange-500' },
  PENDING: { text: 'Ожидает подтверждения', icon: Clock, color: 'text-yellow-500' },
  CONFIRMED: { text: 'Подтверждён', icon: CheckCircle, color: 'text-blue-500' },
  PROCESSING: { text: 'В сборке', icon: Package, color: 'text-purple-500' },
  SHIPPED: { text: 'Передали курьеру', icon: Truck, color: 'text-cyan-500' },
  DELIVERED: { text: 'Доставлен', icon: Home, color: 'text-green-500' },
  CANCELLED: { text: 'Отменён', icon: XCircle, color: 'text-red-500' },
  PAYMENT_EXPIRED: { text: 'Оплата истекла', icon: XCircle, color: 'text-gray-500' },
};

// Доступные переходы статусов
const availableStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [],
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_EXPIRED]: [],
};

export default function AdminPage() {
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliveryCostModal, setShowDeliveryCostModal] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: OrderStatus } | null>(null);
  const queryClient = useQueryClient();

  // Загрузка заказов
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', selectedFilter],
    queryFn: () => adminApi.getOrders(selectedFilter === 'ALL' ? undefined : selectedFilter),
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });

  // Мутация для изменения статуса
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, deliveryCost }: { orderId: string; status: OrderStatus; deliveryCost?: number }) =>
      adminApi.updateOrderStatus(orderId, status, deliveryCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Статус заказа обновлен');
      setExpandedOrder(null);
      setShowDeliveryCostModal(false);
      setDeliveryCost('');
      setPendingStatusChange(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении статуса');
    },
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    // Если статус SHIPPED (передал курьеру), показываем модальное окно для ввода стоимости доставки
    if (newStatus === OrderStatus.SHIPPED) {
      setPendingStatusChange({ orderId, status: newStatus });
      setShowDeliveryCostModal(true);
    } else {
      updateStatusMutation.mutate({ orderId, status: newStatus });
    }
  };

  const handleDeliveryCostSubmit = () => {
    if (!pendingStatusChange) return;

    const cost = parseFloat(deliveryCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Введите корректную стоимость доставки');
      return;
    }

    updateStatusMutation.mutate({
      orderId: pendingStatusChange.orderId,
      status: pendingStatusChange.status,
      deliveryCost: cost,
    });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Фильтрация заказов по поисковому запросу
  const filteredOrders = (orders || []).filter(order => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const searchableFields = [
      order.orderNumber,
      order.user.firstName,
      order.user.lastName,
      order.user.username,
      order.user.telegramId?.toString(),
      order.deliveryPhone,
      order.deliveryAddress,
    ].filter(Boolean).map(field => field?.toString().toLowerCase());

    return searchableFields.some(field => field?.includes(query));
  });

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tg-button bg-opacity-10 rounded-xl">
              <Shield className="w-6 h-6 text-tg-button" />
            </div>
            <h1 className="text-2xl font-bold text-tg-text">Админ-панель</h1>
          </div>
          <div className="text-sm text-tg-hint">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'заказ' : 'заказов'}
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по номеру, имени, телефону, telegram..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-tg-secondary-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
            />
          </div>
        </motion.div>

        {/* Filter buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto pb-2"
        >
          <div className="flex gap-2 min-w-max">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              const isActive = selectedFilter === status;
              const count = status === 'ALL'
                ? orders?.length || 0
                : orders?.filter(o => o.status === status).length || 0;

              return (
                <button
                  key={status}
                  onClick={() => setSelectedFilter(status as OrderStatus | 'ALL')}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-tg-button text-tg-button-text shadow-lg scale-105'
                      : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{config.text}</span>
                  {count > 0 && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white bg-opacity-20' : 'bg-tg-button bg-opacity-10 text-tg-button'}
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-6 bg-tg-secondary-bg rounded-full mb-4">
              <Filter className="w-12 h-12 text-tg-hint" />
            </div>
            <h3 className="text-xl font-bold text-tg-text mb-2">Заказов не найдено</h3>
            <p className="text-tg-hint">
              {selectedFilter === 'ALL'
                ? 'Нет ни одного заказа'
                : `Нет заказов со статусом "${statusConfig[selectedFilter].text}"`
              }
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, index) => {
                const statusInfo = statusConfig[order.status];
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedOrder === order.id;
                const availableTransitions = availableStatusTransitions[order.status];

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-tg-secondary-bg rounded-2xl overflow-hidden"
                  >
                    {/* Order header */}
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full p-4 text-left hover:bg-tg-bg hover:bg-opacity-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusInfo.color}`} />
                            <h3 className="font-bold text-tg-text">
                              Заказ #{order.orderNumber}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-tg-hint mb-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{order.user.firstName} {order.user.lastName || ''}</span>
                            </div>
                            {order.user.username && (
                              <a
                                href={`https://t.me/${order.user.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-tg-link hover:underline"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>@{order.user.username}</span>
                              </a>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${statusInfo.color}`}>
                              {statusInfo.text}
                            </span>
                            <span className="text-lg font-bold text-tg-text">
                              {order.totalAmount.toLocaleString()}₽
                            </span>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-5 h-5 text-tg-hint" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-tg-bg"
                        >
                          <div className="p-4 space-y-4">
                            {/* Товары */}
                            <div>
                              <h4 className="text-sm font-semibold text-tg-text mb-2">Товары:</h4>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="bg-tg-bg rounded-lg p-3 space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Package className="w-4 h-4 text-tg-hint flex-shrink-0" />
                                      <span className="text-tg-text flex-1 font-medium">
                                        {item.product.name}
                                      </span>
                                      <span className="text-tg-hint">× {item.quantity}</span>
                                      <span className="text-tg-text font-medium">
                                        {(item.price * item.quantity).toLocaleString()}₽
                                      </span>
                                    </div>
                                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                      <div className="pl-6 text-xs text-tg-hint">
                                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                                          <span key={key} className="inline-block mr-3">
                                            {key}: <span className="text-tg-text">{value as string}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Доставка */}
                            {order.deliveryAddress && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-tg-text">Доставка:</h4>
                                <div className="bg-tg-bg rounded-lg p-3 space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-tg-hint flex-shrink-0 mt-0.5" />
                                    <span className="text-tg-text">{order.deliveryAddress}</span>
                                  </div>
                                  {order.deliveryPhone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-tg-hint flex-shrink-0" />
                                      <span className="text-tg-text">{order.deliveryPhone}</span>
                                    </div>
                                  )}
                                  {order.deliveryDate && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-tg-hint flex-shrink-0" />
                                      <span className="text-tg-text">
                                        {new Date(order.deliveryDate).toLocaleDateString('ru-RU')}
                                        {order.deliveryTime && `, ${order.deliveryTime}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Комментарий */}
                            {order.comment && (
                              <div>
                                <h4 className="text-sm font-semibold text-tg-text mb-2">Комментарий:</h4>
                                <p className="text-sm text-tg-hint bg-tg-bg rounded-lg p-3">
                                  {order.comment}
                                </p>
                              </div>
                            )}

                            {/* Бонусы */}
                            {(order.bonusUsed > 0 || order.bonusEarned > 0) && (
                              <div className="flex items-center justify-between text-sm bg-tg-bg rounded-lg p-3">
                                {order.bonusUsed > 0 && (
                                  <span className="text-orange-500">
                                    Использовано: {order.bonusUsed} б.
                                  </span>
                                )}
                                {order.bonusEarned > 0 && (
                                  <span className="text-green-500">
                                    Начислено: {order.bonusEarned} б.
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Кнопки изменения статуса */}
                            {availableTransitions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-tg-text mb-2">
                                  Изменить статус:
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {availableTransitions.map((newStatus) => {
                                    const newStatusInfo = statusConfig[newStatus];
                                    const NewStatusIcon = newStatusInfo.icon;
                                    const isUpdating = updateStatusMutation.isPending;

                                    return (
                                      <button
                                        key={newStatus}
                                        onClick={() => handleStatusChange(order.id, newStatus)}
                                        disabled={isUpdating}
                                        className={`
                                          flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                                          ${newStatus === OrderStatus.CANCELLED
                                            ? 'bg-red-500 bg-opacity-10 text-red-500 hover:bg-opacity-20'
                                            : 'bg-tg-button text-tg-button-text hover:opacity-90'
                                          }
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                      >
                                        {isUpdating ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <NewStatusIcon className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">{newStatusInfo.text}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Модальное окно для ввода стоимости доставки */}
      <AnimatePresence>
        {showDeliveryCostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowDeliveryCostModal(false);
              setDeliveryCost('');
              setPendingStatusChange(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-tg-secondary-bg rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-tg-button" />
                <h3 className="text-xl font-bold text-tg-text">Стоимость доставки</h3>
              </div>

              <p className="text-sm text-tg-hint">
                Укажите сумму, которую вы заплатили за доставку этого заказа
              </p>

              <div>
                <label className="block text-sm text-tg-hint mb-2">
                  Стоимость такси (в рублях) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                  placeholder="Например: 300"
                  className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleDeliveryCostSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeliveryCostModal(false);
                    setDeliveryCost('');
                    setPendingStatusChange(null);
                  }}
                  className="flex-1 px-4 py-3 bg-tg-bg text-tg-text rounded-xl font-medium hover:opacity-80 transition-opacity"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeliveryCostSubmit}
                  disabled={updateStatusMutation.isPending || !deliveryCost}
                  className="flex-1 px-4 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateStatusMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Сохранение...</span>
                    </div>
                  ) : (
                    'Подтвердить'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
