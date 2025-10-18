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
  Users,
  TrendingUp,
  BarChart3,
  Gift,
  Coins,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '../api/order';
import {
  adminApi,
  AdminAccess,
  CrmOverview,
  RevenueSeries,
  CrmUsersResponse,
  CrmUserDetails,
} from '../api/admin';
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

const crmSortOptions = [
  { value: 'spent_desc', label: 'По выручке (убыв.)' },
  { value: 'spent_asc', label: 'По выручке (возр.)' },
  { value: 'newest', label: 'Новые пользователи' },
  { value: 'oldest', label: 'Старые пользователи' },
  { value: 'last_active', label: 'По активности' },
  { value: 'bonuses_desc', label: 'По бонусам' },
] as const;

type CrmSortOption = (typeof crmSortOptions)[number]['value'];

const crmRangeOptions = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: '180 дней', value: 180 },
] as const;

const crmPeriodOptions: Record<'daily' | 'weekly' | 'monthly', number[]> = {
  daily: [7, 14, 30],
  weekly: [6, 12, 24],
  monthly: [6, 12, 18],
};

const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: value < 1000 ? 2 : 0,
    maximumFractionDigits: value < 1000 ? 2 : 0,
  })}₽`;
};

const formatNumber = (value: number): string => value.toLocaleString('ru-RU');

const formatDate = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatPeriodLabel = (interval: RevenueSeries['interval'], start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (interval === 'monthly') {
    return startDate.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  }

  if (interval === 'weekly') {
    return `${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} — ${new Date(
      endDate.getTime() - 86400000
    ).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
  }

  return startDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
};

const buildUserTitle = (user: CrmUsersResponse['items'][number]) => {
  if (user.name) {
    return user.name;
  }
  if (user.username) {
    return `@${user.username}`;
  }
  return `#${user.telegramId}`;
};

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'orders' | 'crm'>('orders');

  // Orders state
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliveryCostModal, setShowDeliveryCostModal] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: OrderStatus } | null>(null);

  // CRM state
  const [crmRangeDays, setCrmRangeDays] = useState<number>(30);
  const [crmInterval, setCrmInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [crmPeriods, setCrmPeriods] = useState<number>(14);
  const [crmSearchInput, setCrmSearchInput] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSort, setCrmSort] = useState<CrmSortOption>('spent_desc');
  const [crmPage, setCrmPage] = useState(1);
  const crmPageSize = 20;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCrmSearch(crmSearchInput.trim());
      setCrmPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [crmSearchInput]);

  useEffect(() => {
    const periodList = crmPeriodOptions[crmInterval];
    if (!periodList.includes(crmPeriods)) {
      setCrmPeriods(periodList[1] ?? periodList[0]);
    }
  }, [crmInterval, crmPeriods]);

  // Access rights
  const { data: access, isLoading: isAccessLoading } = useQuery<AdminAccess>({
    queryKey: ['admin-access'],
    queryFn: adminApi.getAccess,
  });

  const availableTabs = useMemo(() => {
    const tabs: Array<'orders' | 'crm'> = [];
    if (access?.permissions.manageOrders) {
      tabs.push('orders');
    }
    if (access?.permissions.viewCrm) {
      tabs.push('crm');
    }
    return tabs;
  }, [access]);

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  // Orders query
  const {
    data: orders,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
  } = useQuery({
    queryKey: ['admin-orders', selectedFilter],
    queryFn: () => adminApi.getOrders(selectedFilter === 'ALL' ? undefined : selectedFilter),
    refetchInterval: 30000,
    enabled: Boolean(access?.permissions.manageOrders),
  });

  // Update order status
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
    if (isNaN(cost) || cost < 0) {
      toast.error('Введите корректную стоимость доставки');
      return;
    }

    updateStatusMutation.mutate({
      orderId: pendingStatusChange.orderId,
      status: pendingStatusChange.status,
      adminDeliveryCost: cost,
    });
  };

  // CRM queries
  const {
    data: crmOverview,
    isLoading: isOverviewLoading,
    isFetching: isOverviewFetching,
  } = useQuery<CrmOverview>({
    queryKey: ['crm-overview', crmRangeDays],
    queryFn: () => adminApi.getCrmOverview(crmRangeDays),
    enabled: Boolean(access?.permissions.viewCrm),
    refetchInterval: 60000,
  });

  const {
    data: revenueSeries,
    isLoading: isRevenueLoading,
    isFetching: isRevenueFetching,
  } = useQuery<RevenueSeries>({
    queryKey: ['crm-revenue', crmInterval, crmPeriods],
    queryFn: () => adminApi.getRevenueSeries(crmInterval, crmPeriods),
    enabled: Boolean(access?.permissions.viewCrm),
    refetchInterval: 60000,
  });

  const {
    data: crmUsers,
    isLoading: isCrmUsersLoading,
    isFetching: isCrmUsersFetching,
  } = useQuery<CrmUsersResponse>({
    queryKey: ['crm-users', crmSearch, crmSort, crmPage, crmPageSize],
    queryFn: () =>
      adminApi.getCrmUsers({
        search: crmSearch || undefined,
        sort: crmSort,
        page: crmPage,
        pageSize: crmPageSize,
      }),
    enabled: Boolean(access?.permissions.viewCrm),
    placeholderData: (previous) => previous,
  });

  const {
    data: crmUserDetails,
    isLoading: isCrmUserDetailsLoading,
  } = useQuery<CrmUserDetails>({
    queryKey: ['crm-user', selectedUserId],
    queryFn: () => adminApi.getCrmUserDetails(selectedUserId!),
    enabled: Boolean(selectedUserId),
  });

  if (isAccessLoading) {
    return <LoadingScreen />;
  }

  if ((availableTabs?.length ?? 0) === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="max-w-md mx-auto text-center space-y-4 p-8 bg-tg-secondary-bg rounded-3xl">
          <Shield className="w-12 h-12 text-tg-hint mx-auto" />
          <h2 className="text-2xl font-bold text-tg-text">Доступ ограничен</h2>
          <p className="text-sm text-tg-hint">
            Попросите администратора добавить ваш Telegram ID в список CRM или админ пользователей.
          </p>
        </div>
      </div>
    );
  }

  const renderOrdersView = () => {
    if (isOrdersLoading && !orders) {
      return <LoadingScreen />;
    }

    const allOrders = orders ?? [];

    const filteredOrders = allOrders.filter(order => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
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
        .map(field => field?.toString().toLowerCase());

      return searchableFields.some(field => field?.includes(query));
    });

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск по номеру, имени, телефону, telegram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-tg-secondary-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
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
                        : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{config.text}</span>
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-tg-bg text-tg-hint'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-tg-secondary-bg rounded-2xl p-10 text-center space-y-3">
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
                    className="bg-tg-secondary-bg rounded-2xl p-5 shadow-sm space-y-4 border border-transparent hover:border-tg-button/30 transition-all"
                  >
                    <div
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-tg-bg rounded-xl">
                          <Package className="w-5 h-5 text-tg-button" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-tg-text">
                              Заказ #{order.orderNumber}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color} bg-tg-bg`}>
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
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tg-bg text-tg-text text-sm font-medium"
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
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-5 mt-4">
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="bg-tg-bg rounded-xl p-4 space-y-2">
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

                              <div className="bg-tg-bg rounded-xl p-4 space-y-2">
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

                              <div className="bg-tg-bg rounded-xl p-4 space-y-2">
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

                            {order.comment && (
                              <div>
                                <h4 className="text-sm font-semibold text-tg-text mb-2">Комментарий:</h4>
                                <p className="text-sm text-tg-hint bg-tg-bg rounded-lg p-3">
                                  {order.comment}
                                </p>
                              </div>
                            )}

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
      </div>
    );
  };

  const renderCrmView = () => {
    const metrics = crmOverview?.metrics;

    const crmUsersData: CrmUsersResponse['items'] = crmUsers?.items ?? [];
    const hasCrmUsers = crmUsersData.length > 0;

    const metricCards = metrics
      ? [
          {
            label: 'Выручка (всего)',
            value: formatCurrency(metrics.totalRevenue),
            subValue: `+${formatCurrency(metrics.revenueRange)} за период`,
            icon: TrendingUp,
            accent: 'bg-emerald-500/10 text-emerald-400',
          },
          {
            label: 'Пользователи',
            value: formatNumber(metrics.totalUsers),
            subValue: `Новых за 7 дней: ${formatNumber(metrics.newUsers7d)}`,
            icon: Users,
            accent: 'bg-blue-500/10 text-blue-400',
          },
          {
            label: 'Средний чек',
            value: formatCurrency(metrics.averageOrderValue),
            subValue: `${formatNumber(metrics.deliveredOrders)} доставленных заказов`,
            icon: Coins,
            accent: 'bg-purple-500/10 text-purple-400',
          },
          {
            label: 'Бонусы',
            value: `${formatNumber(metrics.totalBonusEarned)} начислено`,
            subValue: `${formatNumber(metrics.totalBonusSpent)} списано`,
            icon: Gift,
            accent: 'bg-amber-500/10 text-amber-400',
          },
        ]
      : [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {crmRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setCrmRangeDays(option.value)}
                className={`
                  px-3 py-2 rounded-xl text-sm font-medium transition-all
                  ${crmRangeDays === option.value ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'}
                `}
              >
                {option.label}
              </button>
            ))}
            {isOverviewFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
          </div>

          <div className="flex items-center gap-2 text-sm text-tg-hint">
            <BarChart3 className="w-4 h-4" />
            Обновлено: {crmOverview ? new Date(crmOverview.generatedAt).toLocaleString('ru-RU') : '—'}
          </div>
        </div>

        {metrics ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {metricCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-tg-secondary-bg rounded-2xl p-5 space-y-3 border border-transparent hover:border-tg-button/30 transition-colors">
                  <div className={`inline-flex items-center justify-center ${card.accent} rounded-xl p-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-tg-hint">{card.label}</p>
                    <p className="text-2xl font-bold text-tg-text">{card.value}</p>
                    <p className="text-xs text-tg-hint">{card.subValue}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <div className="bg-tg-secondary-bg rounded-2xl p-8 text-center text-tg-hint">
            {isOverviewLoading ? 'Загружаем статистику...' : 'Нет данных для указанного периода'}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-tg-secondary-bg rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-tg-text">Динамика выручки</h3>
                <p className="text-sm text-tg-hint">Сумма доставленных заказов и их количество</p>
              </div>
              <div className="flex items-center gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setCrmInterval(option)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                      crmInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                    }`}
                  >
                    {option === 'daily' ? 'Дни' : option === 'weekly' ? 'Недели' : 'Месяцы'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {crmPeriodOptions[crmInterval].map(period => (
                <button
                  key={period}
                  onClick={() => setCrmPeriods(period)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    crmPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                  }`}
                >
                  {period} {crmInterval === 'monthly' ? 'мес.' : crmInterval === 'weekly' ? 'нед.' : 'дн.'}
                </button>
              ))}
              {isRevenueFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
            </div>

            <div className="space-y-3">
              {isRevenueLoading && (
                <div className="flex items-center justify-center py-10 text-tg-hint text-sm">
                  Загружаем динамику...
                </div>
              )}
              {!isRevenueLoading && revenueSeries && revenueSeries.points.length > 0 ? (
                <div className="space-y-4">
                  {revenueSeries.points.map(point => {
                    const maxRevenue = Math.max(...revenueSeries.points.map(p => p.totalAmount));
                    const barPercent = maxRevenue > 0 ? Math.round((point.totalAmount / maxRevenue) * 100) : 0;
                    return (
                      <div key={point.periodStart} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-tg-hint">
                          <span>{formatPeriodLabel(revenueSeries.interval, point.periodStart, point.periodEnd)}</span>
                          <span>{point.ordersCount} заказов</span>
                        </div>
                        <div className="h-2 bg-tg-bg rounded-full overflow-hidden">
                          <div
                            style={{ width: `${barPercent}%` }}
                            className="h-full bg-gradient-to-r from-tg-button to-emerald-400 transition-all"
                          />
                        </div>
                        <div className="text-sm font-semibold text-tg-text">
                          {formatCurrency(point.totalAmount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-tg-hint text-sm">
                  Недостаточно данных для выбранного периода
                </div>
              )}
            </div>
          </div>

          <div className="bg-tg-secondary-bg rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-tg-text">Топ клиентов</h3>
                <p className="text-sm text-tg-hint">По доставленной выручке</p>
              </div>
            </div>

            <div className="space-y-3">
              {crmOverview?.topCustomers.length ? (
                crmOverview.topCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedUserId(customer.id)}
                    className="w-full flex items-center justify-between gap-3 bg-tg-bg hover:bg-tg-bg/70 transition-colors rounded-xl p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tg-secondary-bg text-sm font-semibold text-tg-text">
                        {customer.name ? customer.name[0]?.toUpperCase() : '#'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-tg-text">{customer.name ?? `#${customer.telegramId}`}</div>
                        <div className="text-xs text-tg-hint">
                          {customer.deliveredOrders} заказов · последняя {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('ru-RU') : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-tg-text">{formatCurrency(customer.deliveredRevenue)}</div>
                      <div className="text-xs text-tg-hint">
                        Бонусов: {formatNumber(customer.bonusPoints)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-tg-hint py-6 text-center">
                  Пока нет клиентов с доставленными заказами
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-tg-secondary-bg rounded-2xl p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
              <input
                type="text"
                value={crmSearchInput}
                onChange={(e) => setCrmSearchInput(e.target.value)}
                placeholder="Поиск по имени, телефону, Telegram ID..."
                className="w-full pl-12 pr-4 py-3 bg-tg-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
              />
            </div>
            <div className="relative w-full lg:w-auto">
              <select
                value={crmSort}
                onChange={(e) => {
                  setCrmSort(e.target.value as CrmSortOption);
                  setCrmPage(1);
                }}
                className="w-full appearance-none px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
              >
                {crmSortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint pointer-events-none" />
            </div>
          </div>

          <div className="space-y-3">
            {(isCrmUsersLoading || !crmUsers) && (
              <div className="text-sm text-tg-hint text-center py-8">
                {isCrmUsersLoading ? 'Загружаем пользователей...' : 'Нет данных'}
              </div>
            )}

            {hasCrmUsers && (
              <div className="space-y-3">
                {crmUsersData.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="w-full bg-tg-bg hover:bg-tg-bg/70 transition-colors rounded-2xl p-4 text-left"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-secondary-bg text-base font-semibold text-tg-text">
                          {user.name ? user.name[0]?.toUpperCase() : '#'}
                        </div>
                        <div>
                          <div className="text-base font-semibold text-tg-text">{buildUserTitle(user)}</div>
                          <div className="text-xs text-tg-hint flex flex-wrap gap-2">
                            <span>ID: {user.telegramId}</span>
                            {user.phone && <span>{user.phone}</span>}
                            <span>Создан: {formatDate(user.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 text-sm">
                        <div>
                          <div className="text-tg-hint text-xs">Выручка</div>
                          <div className="font-semibold text-tg-text">{formatCurrency(user.totalSpent)}</div>
                        </div>
                        <div>
                          <div className="text-tg-hint text-xs">Заказы</div>
                          <div className="font-semibold text-tg-text">
                            {user.deliveredOrders}/{user.ordersCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-tg-hint text-xs">Средний чек</div>
                          <div className="font-semibold text-tg-text">
                            {formatCurrency(user.averageOrderValue || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-tg-hint text-xs">Бонусы</div>
                          <div className="font-semibold text-tg-text">{formatNumber(user.bonusPoints)}</div>
                        </div>
                        <div className="text-xs text-tg-hint">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {user.lastOrder ? `Последний заказ ${new Date(user.lastOrder.createdAt).toLocaleDateString('ru-RU')}` : 'Еще не заказывал'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {crmUsers && hasCrmUsers && (
              <div className="flex items-center justify-between text-sm text-tg-hint">
                <div>
                  Стр. {crmUsers.page} из {crmUsers.totalPages || 1} · всего {crmUsers.total} пользователей
                  {isCrmUsersFetching && <Loader2 className="w-4 h-4 inline-block ml-2 animate-spin" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCrmPage(prev => Math.max(prev - 1, 1))}
                    disabled={!crmUsers.hasPrevPage}
                    className="p-2 rounded-xl bg-tg-bg text-tg-text disabled:opacity-40"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCrmPage(prev => prev + 1)}
                    disabled={!crmUsers.hasNextPage}
                    className="p-2 rounded-xl bg-tg-bg text-tg-text disabled:opacity-40"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectedUserId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedUserId(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                className="max-w-3xl w-full bg-tg-secondary-bg rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {isCrmUserDetailsLoading || !crmUserDetails ? (
                  <div className="text-center py-16 text-tg-hint text-sm">
                    Загружаем профиль...
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tg-bg rounded-full text-xs text-tg-hint">
                          <Users className="w-3 h-3" />
                          Клиент #{crmUserDetails.user.telegramId}
                        </div>
                        <h3 className="text-2xl font-bold text-tg-text">
                          {crmUserDetails.user.firstName || crmUserDetails.user.lastName
                            ? `${crmUserDetails.user.firstName ?? ''} ${crmUserDetails.user.lastName ?? ''}`.trim()
                            : crmUserDetails.user.username
                              ? `@${crmUserDetails.user.username}`
                              : `#${crmUserDetails.user.telegramId}`}
                        </h3>
                        <div className="text-sm text-tg-hint space-y-1">
                          <div>Профиль создан: {formatDate(crmUserDetails.user.createdAt)}</div>
                          <div>Последний вход: {formatDate(crmUserDetails.user.lastLoginAt)}</div>
                          {crmUserDetails.user.phone && <div>Телефон: {crmUserDetails.user.phone}</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className="px-3 py-2 rounded-xl bg-tg-bg text-tg-text text-sm font-medium hover:opacity-80 transition-opacity"
                      >
                        Закрыть
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-tg-bg rounded-2xl p-4">
                        <div className="text-xs text-tg-hint uppercase mb-1">Выручка</div>
                        <div className="text-lg font-semibold text-tg-text">
                          {formatCurrency(crmUserDetails.stats.deliveredRevenue)}
                        </div>
                        <div className="text-xs text-tg-hint">
                          {crmUserDetails.stats.deliveredOrders} доставленных заказов
                        </div>
                      </div>
                      <div className="bg-tg-bg rounded-2xl p-4">
                        <div className="text-xs text-tg-hint uppercase mb-1">Средний чек</div>
                        <div className="text-lg font-semibold text-tg-text">
                          {formatCurrency(crmUserDetails.stats.averageOrderValue || 0)}
                        </div>
                        <div className="text-xs text-tg-hint">
                          Всего заказов: {crmUserDetails.stats.totalOrders}
                        </div>
                      </div>
                      <div className="bg-tg-bg rounded-2xl p-4">
                        <div className="text-xs text-tg-hint uppercase mb-1">Бонусы</div>
                        <div className="text-lg font-semibold text-tg-text">
                          {formatNumber(crmUserDetails.user.bonusPoints)} б.
                        </div>
                        <div className="text-xs text-tg-hint">
                          Начислено: {formatNumber(crmUserDetails.stats.totalBonusEarned)} б.
                        </div>
                      </div>
                      <div className="bg-tg-bg rounded-2xl p-4">
                        <div className="text-xs text-tg-hint uppercase mb-1">Активность</div>
                        <div className="text-lg font-semibold text-tg-text">
                          {crmUserDetails.stats.lastOrderAt ? formatDate(crmUserDetails.stats.lastOrderAt) : '—'}
                        </div>
                        <div className="text-xs text-tg-hint">
                          Первый заказ: {crmUserDetails.stats.firstOrderAt ? formatDate(crmUserDetails.stats.firstOrderAt) : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-tg-text">Недавние заказы</h4>
                        <div className="space-y-2">
                          {crmUserDetails.recentOrders.length ? (
                            crmUserDetails.recentOrders.map(order => (
                              <div key={order.id} className="bg-tg-bg rounded-xl p-3 space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-tg-text">#{order.orderNumber}</div>
                                  <div className="text-xs text-tg-hint">{new Date(order.createdAt).toLocaleString('ru-RU')}</div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-tg-text">
                                  <span>{order.status}</span>
                                  <span className="font-semibold">{order.totalAmount.toLocaleString('ru-RU')}₽</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-tg-hint">
                                  {order.items.map(item => (
                                    <span key={`${item.productId}-${item.name}`} className="px-2 py-1 rounded-lg bg-tg-secondary-bg">
                                      {item.name} ×{item.quantity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-tg-hint py-4 text-center">Заказов пока нет</div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-tg-text">История бонусов</h4>
                        <div className="space-y-2">
                          {crmUserDetails.bonusHistory.length ? (
                            crmUserDetails.bonusHistory.map(tx => (
                              <div key={tx.id} className="bg-tg-bg rounded-xl p-3 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-tg-text">{tx.type}</span>
                                  <span className={tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                  </span>
                                </div>
                                {tx.description && (
                                  <div className="text-xs text-tg-hint mt-1">{tx.description}</div>
                                )}
                                <div className="text-xs text-tg-hint mt-1">
                                  {new Date(tx.createdAt).toLocaleString('ru-RU')}
                                  {tx.orderId && ` · Заказ ${tx.orderId.slice(0, 6)}...`}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-tg-hint py-4 text-center">История бонусов пока пуста</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tg-secondary-bg rounded-xl">
              <Shield className="w-6 h-6 text-tg-button" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-tg-text">
                {activeTab === 'crm' ? 'CRM-аналитика' : 'Админ-панель'}
              </h1>
              <p className="text-sm text-tg-hint">
                {activeTab === 'crm'
                  ? 'Следите за выручкой и клиентами в одном месте'
                  : 'Управляйте заказами и статусами доставки'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-tg-secondary-bg rounded-xl p-1">
            {availableTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-tg-button text-tg-button-text shadow-lg' : 'text-tg-hint'
                }`}
              >
                {tab === 'orders' ? 'Заказы' : 'CRM'}
              </button>
            ))}
          </div>
        </motion.div>

        {activeTab === 'orders' && access?.permissions.manageOrders && renderOrdersView()}
        {activeTab === 'crm' && access?.permissions.viewCrm && renderCrmView()}
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
