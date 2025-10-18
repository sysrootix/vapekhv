import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
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
  Shield,
  Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingScreen from '../components/LoadingScreen';
import { OrderStatus } from '../api/order';
import { adminApi, AdminAccess, AdminOrder } from '../api/admin';

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

const filterOrders = (orders: AdminOrder[], search: string) => {
  if (!search.trim()) return orders;
  const query = search.toLowerCase();
  return orders.filter(order => {
    const searchableFields = [
      order.orderNumber,
      order.user.firstName,
      order.user.lastName,
      order.user.username,
      order.user.telegramId ? String(order.user.telegramId) : undefined,
      order.deliveryPhone,
      order.deliveryAddress,
    ]
      .filter(Boolean)
      .map(field => field!.toString().toLowerCase());

    return searchableFields.some(field => field.includes(query));
  });
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliveryCostModal, setShowDeliveryCostModal] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: OrderStatus } | null>(null);

  const { data: access, isLoading: isAccessLoading } = useQuery<AdminAccess>({
    queryKey: ['admin-access'],
    queryFn: adminApi.getAccess,
  });

  const canManageOrders = Boolean(access?.permissions.manageOrders);

  const {
    data: orders,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
  } = useQuery({
    queryKey: ['admin-orders', selectedFilter],
    queryFn: () => adminApi.getOrders(selectedFilter === 'ALL' ? undefined : selectedFilter),
    refetchInterval: 30000,
    enabled: canManageOrders,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, adminDeliveryCost }: { orderId: string; status: OrderStatus; adminDeliveryCost?: number }) =>
      adminApi.updateOrderStatus(orderId, status, adminDeliveryCost),
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
    if (Number.isNaN(cost) || cost < 0) {
      toast.error('Введите корректную стоимость доставки');
      return;
    }

    updateStatusMutation.mutate({
      orderId: pendingStatusChange.orderId,
      status: pendingStatusChange.status,
      adminDeliveryCost: cost,
    });
  };

  if (isAccessLoading) {
    return <LoadingScreen />;
  }

  if (!canManageOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="max-w-md mx-auto text-center space-y-4 p-8 bg-tg-secondary-bg rounded-3xl">
          <Shield className="w-12 h-12 text-tg-hint mx-auto" />
          <h2 className="text-2xl font-bold text-tg-text">Нет доступа</h2>
          <p className="text-sm text-tg-hint">
            Ваш Telegram ID не добавлен в список администраторов. Обратитесь к владельцу бота.
          </p>
        </div>
      </div>
    );
  }

  if (isOrdersLoading && !orders) {
    return <LoadingScreen />;
  }

  const allOrders = orders ?? [];
  const filteredOrders = filterOrders(allOrders, searchQuery);

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 bg-tg-secondary-bg rounded-xl">
            <Shield className="w-6 h-6 text-tg-button" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-tg-text">Админ-панель</h1>
            <p className="text-sm text-tg-hint">Управляйте заказами и отслеживайте статусы доставки</p>
          </div>
        </motion.div>

        <section className="bg-tg-secondary-bg rounded-3xl p-6 space-y-6 border border-transparent">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск по номеру, имени, телефону, telegram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-tg-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
              />
            </div>
            <div className="text-sm text-tg-hint">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'заказ' : 'заказов'}
              {isOrdersFetching && <Loader2 className="w-4 h-4 inline-block ml-2 animate-spin" />}
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {Object.entries(statusConfig).map(([status, config]) => {
                const Icon = config.icon;
                const isActive = selectedFilter === status;
                const count = status === 'ALL'
                  ? allOrders.length
                  : allOrders.filter(o => o.status === status).length;

                return (
                  <button
                    key={status}
                    onClick={() => setSelectedFilter(status as OrderStatus | 'ALL')}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-tg-button text-tg-button-text shadow-lg scale-105'
                        : 'bg-tg-bg text-tg-hint hover:bg-opacity-80'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{config.text}</span>
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-tg-secondary-bg text-tg-hint'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-tg-bg rounded-2xl p-10 text-center space-y-3">
                <Package className="w-10 h-10 text-tg-hint mx-auto" />
                <h3 className="text-lg font-semibold text-tg-text">Нет заказов</h3>
                <p className="text-sm text-tg-hint">Попробуйте изменить фильтр или сбросить поиск.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredOrders.map((order, orderIdx) => {
                  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.ALL;
                  const transitions = availableStatusTransitions[order.status as OrderStatus] || [];
                  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  const totalWithoutDelivery = order.totalAmount - (order.deliveryCost || 0);

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: orderIdx * 0.02 }}
                      className="bg-tg-bg rounded-2xl p-5 shadow-sm space-y-4 border border-transparent hover:border-tg-button/30 transition-all"
                    >
                      <div
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-tg-secondary-bg rounded-xl">
                            <Package className="w-5 h-5 text-tg-button" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-tg-text">
                                Заказ #{order.orderNumber}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color} bg-tg-secondary-bg`}>
                                {statusInfo.text}
                              </span>
                            </div>
                            <div className="text-sm text-tg-hint">
                              {new Date(order.createdAt).toLocaleString('ru-RU')}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-tg-hint">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {order.user.firstName || order.user.lastName
                                  ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
                                  : order.user.username
                                    ? `@${order.user.username}`
                                    : String(order.user.telegramId)}
                              </span>
                              {order.user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {order.user.phone}
                                </span>
                              )}
                              {order.deliveryAddress && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {order.deliveryAddress}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-tg-text">
                              {order.totalAmount.toLocaleString('ru-RU')}₽
                            </div>
                            <div className="text-sm text-tg-hint">
                              {totalItems} {totalItems === 1 ? 'товар' : 'товаров'}
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-text text-sm font-medium"
                          >
                            Подробности
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}
                            />
                          </motion.button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedOrder === order.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="grid gap-5 mt-4">
                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-tg-secondary-bg rounded-xl p-4 space-y-2">
                                  <span className="text-xs uppercase text-tg-hint font-semibold tracking-wide">
                                    Итоговая сумма
                                  </span>
                                  <div className="text-2xl font-bold text-tg-text">
                                    {order.totalAmount.toLocaleString('ru-RU')}₽
                                  </div>
                                  {order.deliveryCost > 0 && (
                                    <div className="text-xs text-tg-hint">
                                      Доставка: {order.deliveryCost.toLocaleString('ru-RU')}₽
                                    </div>
                                  )}
                                  <div className="text-xs text-tg-hint">
                                    Товары: {totalWithoutDelivery.toLocaleString('ru-RU')}₽
                                  </div>
                                </div>

                                <div className="bg-tg-secondary-bg rounded-xl p-4 space-y-2">
                                  <span className="text-xs uppercase text-tg-hint font-semibold tracking-wide">
                                    Клиент
                                  </span>
                                  <div className="text-sm text-tg-text">
                                    <div className="font-semibold">
                                      {order.user.firstName || order.user.lastName
                                        ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
                                        : 'Нет имени'}
                                    </div>
                                    <div className="text-xs text-tg-hint">
                                      Telegram ID: {String(order.user.telegramId)}
                                    </div>
                                    {order.user.username && (
                                      <div className="text-xs text-tg-hint">
                                        @{order.user.username}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-tg-secondary-bg rounded-xl p-4 space-y-2">
                                  <span className="text-xs uppercase text-tg-hint font-semibold tracking-wide">
                                    Контакты
                                  </span>
                                  <div className="space-y-1 text-sm text-tg-text">
                                    {order.deliveryPhone ? (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-tg-hint" />
                                        <span>{order.deliveryPhone}</span>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-tg-hint">Телефон не указан</div>
                                    )}
                                    {order.user.bonusPoints !== undefined && (
                                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <Gift className="w-4 h-4" />
                                        <span>Бонусов: {order.user.bonusPoints}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-tg-text mb-2">Товары:</h4>
                                <div className="space-y-2">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="bg-tg-secondary-bg rounded-lg p-3 space-y-1">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Package className="w-4 h-4 text-tg-hint flex-shrink-0" />
                                        <span className="text-tg-text flex-1 font-medium">
                                          {item.product.name}
                                        </span>
                                        <span className="text-tg-hint">× {item.quantity}</span>
                                        <span className="text-tg-text font-semibold">
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

                              {order.deliveryAddress && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-tg-text">Доставка:</h4>
                                  <div className="bg-tg-secondary-bg rounded-lg p-3 space-y-2 text-sm">
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

                              {order.comment && (
                                <div>
                                  <h4 className="text-sm font-semibold text-tg-text mb-2">Комментарий:</h4>
                                  <p className="text-sm text-tg-hint bg-tg-secondary-bg rounded-lg p-3">
                                    {order.comment}
                                  </p>
                                </div>
                              )}

                              {(order.bonusUsed > 0 || order.bonusEarned > 0) && (
                                <div className="flex items-center justify-between text-sm bg-tg-secondary-bg rounded-lg p-3">
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

                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-center gap-3 text-sm text-tg-hint">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>
                                    Последнее изменение: {new Date(order.updatedAt).toLocaleString('ru-RU')}
                                  </span>
                                </div>

                                {transitions.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {transitions.map((newStatus) => {
                                      const newStatusInfo = statusConfig[newStatus];
                                      const NewStatusIcon = newStatusInfo.icon;
                                      const isUpdating = updateStatusMutation.isPending && pendingStatusChange?.orderId === order.id && pendingStatusChange.status === newStatus;

                                      return (
                                        <button
                                          key={newStatus}
                                          onClick={() => handleStatusChange(order.id, newStatus)}
                                          disabled={updateStatusMutation.isPending}
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
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>

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
                  onKeyDown={(e) => {
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
