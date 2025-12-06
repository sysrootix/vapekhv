import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Loader2,
  Search,
  ChevronDown,
  TrendingUp,
  BarChart3,
  Coins,
  Clock,
  ShoppingBag,
  Package,
  Info,
} from 'lucide-react';

import LoadingScreen from '../components/LoadingScreen';
import RevenueChart from '../components/charts/RevenueChart';
import NewUsersChart from '../components/charts/NewUsersChart';
import OrdersChart from '../components/charts/OrdersChart';
import ProductsChart from '../components/charts/ProductsChart';
import BasketDepthChart from '../components/charts/BasketDepthChart';
import { CrmTabs, CrmTabId } from '../components/crm/CrmTabs';
import { QuickPeriodSelector, PeriodSelection } from '../components/crm/QuickPeriodSelector';
import { MetricCard } from '../components/crm/MetricCard';
import { ImprovedPagination } from '../components/crm/ImprovedPagination';
import { UserDetailsModal } from '../components/crm/UserDetailsModal';
import { BroadcastForm } from '../components/crm/BroadcastForm';
import { AudienceManager } from '../components/crm/audiences/AudienceManager';
import { ExportReportButton } from '../components/crm/ExportReportButton';
import {
  adminApi,
  AdminAccess,
  CrmOverview,
  RevenueSeries,
  CrmUsersResponse,
  CrmUserDetails,
  NewUsersSeries,
  OrdersSeries,
  ProductsSeries,
  BasketDepthSeries,
  CohortData,
  LTVData,
  TopProductsData,
  OrderTimeAnalysis,
  BonusAnalysis,
  RepeatPurchaseAnalysis,
  RFMAnalysis,
} from '../api/admin';

type IntervalOption = 'daily' | 'weekly' | 'monthly';
type CrmSortOption = 'spent_desc' | 'spent_asc' | 'newest' | 'oldest' | 'last_active' | 'bonuses_desc';

const crmSortOptions = [
  { value: 'spent_desc', label: 'По выручке (убыв.)' },
  { value: 'spent_asc', label: 'По выручке (возр.)' },
  { value: 'newest', label: 'Новые пользователи' },
  { value: 'oldest', label: 'Старые пользователи' },
  { value: 'last_active', label: 'По активности' },
  { value: 'bonuses_desc', label: 'По бонусам' },
] as const;

const intervalOptions: IntervalOption[] = ['daily', 'weekly', 'monthly'];

const crmPeriodOptions: Record<IntervalOption, number[]> = {
  daily: [7, 14, 30],
  weekly: [6, 12, 24],
  monthly: [6, 12, 18],
};

const newUsersPeriodOptions: Record<IntervalOption, number[]> = {
  daily: [7, 14, 30],
  weekly: [6, 12, 24],
  monthly: [6, 12, 18],
};

const formatCurrency = (value: number): string =>
  `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: value < 1000 ? 2 : 0,
    maximumFractionDigits: value < 1000 ? 2 : 0,
  })}₽`;

const formatNumber = (value: number): string => value.toLocaleString('ru-RU');

const formatDateDisplay = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const buildUserTitle = (user: CrmUsersResponse['items'][number]) => {
  if (user.name) return user.name;
  if (user.username) return `@${user.username}`;
  return `#${user.telegramId}`;
};

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<CrmTabId>('overview');
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>({
    preset: 'month',
    compareWith: 'previous',
  });
  const [crmInterval, setCrmInterval] = useState<IntervalOption>('daily');
  const [crmPeriods, setCrmPeriods] = useState<number>(14);
  const [crmSearchInput, setCrmSearchInput] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSort, setCrmSort] = useState<CrmSortOption>('spent_desc');
  const [crmPage, setCrmPage] = useState(1);
  const crmPageSize = 20;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  const [newUsersInterval, setNewUsersInterval] = useState<IntervalOption>('daily');
  const [newUsersPeriods, setNewUsersPeriods] = useState<number>(14);
  
  const [ordersInterval, setOrdersInterval] = useState<IntervalOption>('daily');
  const [ordersPeriods, setOrdersPeriods] = useState<number>(14);
  
  const [productsInterval, setProductsInterval] = useState<IntervalOption>('daily');
  const [productsPeriods, setProductsPeriods] = useState<number>(14);
  
  const [basketDepthInterval, setBasketDepthInterval] = useState<IntervalOption>('daily');
  const [basketDepthPeriods, setBasketDepthPeriods] = useState<number>(14);

  useEffect(() => {
    window.Telegram?.WebApp?.expand();
    window.Telegram?.WebApp?.disableVerticalSwipes?.();
    window.Telegram?.WebApp?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setCrmSearch(crmSearchInput.trim());
      setCrmPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [crmSearchInput]);

  useEffect(() => {
    const options = crmPeriodOptions[crmInterval];
    if (!options.includes(crmPeriods)) {
      setCrmPeriods(options[1] ?? options[0]);
    }
  }, [crmInterval, crmPeriods]);

  useEffect(() => {
    const options = newUsersPeriodOptions[newUsersInterval];
    if (!options.includes(newUsersPeriods)) {
      setNewUsersPeriods(options[1] ?? options[0]);
    }
  }, [newUsersInterval, newUsersPeriods]);

  useEffect(() => {
    const options = crmPeriodOptions[ordersInterval];
    if (!options.includes(ordersPeriods)) {
      setOrdersPeriods(options[1] ?? options[0]);
    }
  }, [ordersInterval, ordersPeriods]);

  useEffect(() => {
    const options = crmPeriodOptions[productsInterval];
    if (!options.includes(productsPeriods)) {
      setProductsPeriods(options[1] ?? options[0]);
    }
  }, [productsInterval, productsPeriods]);

  useEffect(() => {
    const options = crmPeriodOptions[basketDepthInterval];
    if (!options.includes(basketDepthPeriods)) {
      setBasketDepthPeriods(options[1] ?? options[0]);
    }
  }, [basketDepthInterval, basketDepthPeriods]);

  const { data: access, isLoading: isAccessLoading } = useQuery<AdminAccess>({
    queryKey: ['admin-access'],
    queryFn: adminApi.getAccess,
  });

  const canViewCrm = Boolean(access?.permissions.viewCrm);

  // Вычисляем параметры запроса на основе выбранного периода
  const getOverviewParams = () => {
    if (periodSelection.preset && periodSelection.preset !== 'custom') {
      const getPeriodDates = (preset: PeriodSelection['preset']) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (preset) {
          case 'today':
            return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
          case 'yesterday': {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            return { start: yesterday, end: today };
          }
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

      const dates = getPeriodDates(periodSelection.preset);
      const endDateForApi = new Date(dates.end);
      
      const params: Parameters<typeof adminApi.getCrmOverview>[0] = {
        startDate: dates.start.toISOString().split('T')[0],
        endDate: endDateForApi.toISOString().split('T')[0],
      };

      if (periodSelection.compareWith === 'previous') {
        // Автоматически вычисляется на бэкенде
      }

      return params;
    } else if (periodSelection.startDate && periodSelection.endDate) {
      const params: Parameters<typeof adminApi.getCrmOverview>[0] = {
        startDate: periodSelection.startDate,
        endDate: periodSelection.endDate,
      };

      if (periodSelection.compareWith === 'previous') {
        // Автоматически вычисляется на бэкенде
      }

      return params;
    }

    return { rangeDays: 30 };
  };

  const {
    data: crmOverview,
    isLoading: isOverviewLoading,
    isFetching: isOverviewFetching,
  } = useQuery<CrmOverview>({
    queryKey: ['crm-overview', periodSelection],
    queryFn: () => adminApi.getCrmOverview(getOverviewParams()),
    enabled: canViewCrm,
    refetchInterval: 60000,
  });

  const {
    data: revenueSeries,
    isLoading: isRevenueLoading,
    isFetching: isRevenueFetching,
  } = useQuery<RevenueSeries>({
    queryKey: ['crm-revenue', crmInterval, crmPeriods],
    queryFn: () => adminApi.getRevenueSeries(crmInterval, crmPeriods),
    enabled: canViewCrm,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const {
    data: newUsersSeries,
    isLoading: isNewUsersLoading,
    isFetching: isNewUsersFetching,
  } = useQuery<NewUsersSeries>({
    queryKey: ['crm-new-users', newUsersInterval, newUsersPeriods],
    queryFn: () => adminApi.getNewUsersSeries(newUsersInterval, newUsersPeriods),
    enabled: canViewCrm,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const {
    data: ordersSeries,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
  } = useQuery<OrdersSeries>({
    queryKey: ['crm-orders', ordersInterval, ordersPeriods],
    queryFn: () => adminApi.getOrdersSeries(ordersInterval, ordersPeriods),
    enabled: canViewCrm,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const {
    data: productsSeries,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useQuery<ProductsSeries>({
    queryKey: ['crm-products', productsInterval, productsPeriods],
    queryFn: () => adminApi.getProductsSeries(productsInterval, productsPeriods),
    enabled: canViewCrm,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const {
    data: basketDepthSeries,
    isLoading: isBasketDepthLoading,
    isFetching: isBasketDepthFetching,
  } = useQuery<BasketDepthSeries>({
    queryKey: ['crm-basket-depth', basketDepthInterval, basketDepthPeriods],
    queryFn: () => adminApi.getBasketDepthSeries(basketDepthInterval, basketDepthPeriods),
    enabled: canViewCrm,
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
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
    enabled: canViewCrm,
    placeholderData: (prev) => prev,
  });

  const {
    data: crmUserDetails,
  } = useQuery<CrmUserDetails>({
    queryKey: ['crm-user', selectedUserId],
    queryFn: () => adminApi.getCrmUserDetails(selectedUserId!),
    enabled: Boolean(selectedUserId),
  });

  const {
    data: cohortsData,
    isLoading: isCohortsLoading,
  } = useQuery<CohortData>({
    queryKey: ['crm-cohorts'],
    queryFn: () => adminApi.getCohorts(),
    enabled: canViewCrm,
  });

  const {
    data: ltvData,
    isLoading: isLTVLoading,
  } = useQuery<LTVData>({
    queryKey: ['crm-ltv'],
    queryFn: () => adminApi.getLTV(),
    enabled: canViewCrm,
  });

  const {
    data: topProductsData,
    isLoading: isTopProductsLoading,
  } = useQuery<TopProductsData>({
    queryKey: ['crm-top-products'],
    queryFn: () => adminApi.getTopProducts(),
    enabled: canViewCrm,
  });

  const {
    data: orderTimeAnalysis,
    isLoading: isOrderTimeLoading,
  } = useQuery<OrderTimeAnalysis>({
    queryKey: ['crm-order-time-analysis'],
    queryFn: () => adminApi.getOrderTimeAnalysis(),
    enabled: canViewCrm,
  });

  const {
    data: bonusAnalysis,
    isLoading: isBonusAnalysisLoading,
  } = useQuery<BonusAnalysis>({
    queryKey: ['crm-bonus-analysis'],
    queryFn: () => adminApi.getBonusAnalysis(),
    enabled: canViewCrm,
  });

  const {
    data: repeatPurchaseAnalysis,
    isLoading: isRepeatPurchaseLoading,
  } = useQuery<RepeatPurchaseAnalysis>({
    queryKey: ['crm-repeat-purchase-analysis'],
    queryFn: () => adminApi.getRepeatPurchaseAnalysis(),
    enabled: canViewCrm,
  });

  const {
    data: rfmAnalysis,
    isLoading: isRFMLoading,
  } = useQuery<RFMAnalysis>({
    queryKey: ['crm-rfm-analysis'],
    queryFn: () => adminApi.getRFMAnalysis(),
    enabled: canViewCrm,
  });

  if (isAccessLoading) {
    return <LoadingScreen />;
  }

  if (!canViewCrm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="max-w-md mx-auto text-center space-y-4 p-8 bg-tg-secondary-bg rounded-3xl">
          <Shield className="w-12 h-12 text-tg-hint mx-auto" />
          <h2 className="text-2xl font-bold text-tg-text">Нет доступа</h2>
          <p className="text-sm text-tg-hint">
            Ваш Telegram ID не добавлен в список пользователей CRM. Обратитесь к владельцу бота.
          </p>
        </div>
      </div>
    );
  }

  const metrics = crmOverview?.metrics;
  const compare = metrics?.compare;
  
  // Используем периодозависимые метрики
  const totalProductsSold = metrics?.productsInPeriod || 0;
  const averageProductPrice = totalProductsSold > 0 && metrics?.revenueInPeriod
    ? metrics.revenueInPeriod / totalProductsSold
    : 0;

  const getComparePeriodLabel = () => {
    if (!crmOverview?.comparePeriodStart || !crmOverview?.comparePeriodEnd) return null;
    const start = formatDateDisplay(crmOverview.comparePeriodStart);
    const end = formatDateDisplay(crmOverview.comparePeriodEnd);
    return `${start} - ${end}`;
  };

  const crmUsersData = crmUsers?.items ?? [];
  const newUsersPoints = newUsersSeries?.points ?? [];

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 bg-tg-secondary-bg rounded-xl">
            <Shield className="w-6 h-6 text-tg-button" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-tg-text">CRM-панель</h1>
            <p className="text-xs sm:text-sm text-tg-hint">Аналитика и управление клиентами</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <CrmTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content based on active tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Period Selector */}
              <div className="bg-tg-secondary-bg rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-semibold text-tg-text">Выберите период</div>
                    <QuickPeriodSelector value={periodSelection} onChange={setPeriodSelection} />
                    {isOverviewFetching && (
                      <div className="flex items-center gap-2 text-sm text-tg-hint">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Обновление данных...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-tg-hint">
                      <BarChart3 className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span>Обновлено: {crmOverview ? new Date(crmOverview.generatedAt).toLocaleString('ru-RU') : '—'}</span>
                        {crmOverview && (
                          <span className="text-xs">
                            Период: {formatDateDisplay(crmOverview.periodStart)} - {formatDateDisplay(crmOverview.periodEnd)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExportReportButton />
                  </div>
                </div>

                {compare && getComparePeriodLabel() && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-blue-400 mb-1">Сравнение с предыдущим периодом</div>
                      <div className="text-xs text-tg-hint">
                        Период сравнения: {getComparePeriodLabel()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              {metrics ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <MetricCard
                    label="Выручка"
                    value={formatCurrency(metrics.revenueInPeriod)}
                    icon={TrendingUp}
                    accent="bg-emerald-500/10 text-emerald-400"
                    change={compare ? {
                      value: compare.revenueChange,
                      percent: compare.revenueChangePercent,
                      isPositive: true,
                    } : undefined}
                    isLoading={isOverviewLoading}
                  />
                  <MetricCard
                    label="Средний чек"
                    value={formatCurrency(metrics.averageOrderValue)}
                    icon={Coins}
                    accent="bg-purple-500/10 text-purple-400"
                    change={compare ? {
                      value: compare.averageOrderValueChange,
                      percent: compare.averageOrderValueChangePercent,
                      isPositive: true,
                    } : undefined}
                    isLoading={isOverviewLoading}
                  />
                  <MetricCard
                    label="Глубина чека"
                    value={(metrics.averageBasketDepth ?? 0).toFixed(2)}
                    icon={ShoppingBag}
                    accent="bg-indigo-500/10 text-indigo-400"
                    isLoading={isOverviewLoading}
                  />
                  <MetricCard
                    label="Количество покупок"
                    value={formatNumber(metrics.deliveredOrders)}
                    icon={Package}
                    accent="bg-cyan-500/10 text-cyan-400"
                    change={compare ? {
                      value: compare.ordersChange,
                      percent: compare.ordersChangePercent,
                      isPositive: true,
                    } : undefined}
                    isLoading={isOverviewLoading}
                  />
                  <MetricCard
                    label="Количество товаров"
                    value={formatNumber(totalProductsSold)}
                    icon={ShoppingBag}
                    accent="bg-orange-500/10 text-orange-400"
                    isLoading={isOverviewLoading}
                  />
                  <MetricCard
                    label="Средняя цена товара"
                    value={formatCurrency(averageProductPrice)}
                    icon={Coins}
                    accent="bg-pink-500/10 text-pink-400"
                    isLoading={isOverviewLoading}
                  />
                </div>
              ) : (
                <div className="bg-tg-secondary-bg rounded-2xl p-8 text-center text-tg-hint">
                  {isOverviewLoading ? 'Загружаем статистику...' : 'Нет данных для указанного периода'}
                </div>
              )}

              {/* Charts */}
              <div className="grid xl:grid-cols-2 gap-5">
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Динамика выручки</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Сумма доставленных заказов</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervalOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setCrmInterval(option)}
                          className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
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
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          crmPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                        }`}
                      >
                        {period} {crmInterval === 'monthly' ? 'мес.' : crmInterval === 'weekly' ? 'нед.' : 'дн.'}
                      </button>
                    ))}
                    {isRevenueFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
                  </div>

                  <RevenueChart
                    data={revenueSeries?.points || []}
                    interval={crmInterval}
                    chartType="area"
                    isLoading={isRevenueLoading}
                  />
                </div>

                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Новые пользователи</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Количество регистраций</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervalOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setNewUsersInterval(option)}
                          className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                            newUsersInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                          }`}
                        >
                          {option === 'daily' ? 'Дни' : option === 'weekly' ? 'Недели' : 'Месяцы'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {newUsersPeriodOptions[newUsersInterval].map(period => (
                      <button
                        key={period}
                        onClick={() => setNewUsersPeriods(period)}
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          newUsersPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                        }`}
                      >
                        {period} {newUsersInterval === 'monthly' ? 'мес.' : newUsersInterval === 'weekly' ? 'нед.' : 'дн.'}
                      </button>
                    ))}
                    {isNewUsersFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
                  </div>

                  <NewUsersChart
                    data={newUsersPoints}
                    interval={newUsersInterval}
                    isLoading={isNewUsersLoading}
                  />
                </div>
              </div>

              {/* Additional Charts */}
              <div className="grid xl:grid-cols-2 gap-5">
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Динамика покупок</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Количество доставленных заказов</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervalOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setOrdersInterval(option)}
                          className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                            ordersInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                          }`}
                        >
                          {option === 'daily' ? 'Дни' : option === 'weekly' ? 'Недели' : 'Месяцы'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {crmPeriodOptions[ordersInterval].map(period => (
                      <button
                        key={period}
                        onClick={() => setOrdersPeriods(period)}
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          ordersPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                        }`}
                      >
                        {period} {ordersInterval === 'monthly' ? 'мес.' : ordersInterval === 'weekly' ? 'нед.' : 'дн.'}
                      </button>
                    ))}
                    {isOrdersFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
                  </div>

                  <OrdersChart
                    data={ordersSeries?.points || []}
                    interval={ordersInterval}
                    chartType="area"
                    isLoading={isOrdersLoading}
                  />
                </div>

                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Динамика товаров</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Количество проданных товаров</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervalOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setProductsInterval(option)}
                          className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                            productsInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                          }`}
                        >
                          {option === 'daily' ? 'Дни' : option === 'weekly' ? 'Недели' : 'Месяцы'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {crmPeriodOptions[productsInterval].map(period => (
                      <button
                        key={period}
                        onClick={() => setProductsPeriods(period)}
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          productsPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                        }`}
                      >
                        {period} {productsInterval === 'monthly' ? 'мес.' : productsInterval === 'weekly' ? 'нед.' : 'дн.'}
                      </button>
                    ))}
                    {isProductsFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
                  </div>

                  <ProductsChart
                    data={productsSeries?.points || []}
                    interval={productsInterval}
                    chartType="area"
                    isLoading={isProductsLoading}
                  />
                </div>

                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4 xl:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Динамика глубины чека</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Среднее количество товаров в заказе</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervalOptions.map(option => (
                        <button
                          key={option}
                          onClick={() => setBasketDepthInterval(option)}
                          className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                            basketDepthInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                          }`}
                        >
                          {option === 'daily' ? 'Дни' : option === 'weekly' ? 'Недели' : 'Месяцы'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {crmPeriodOptions[basketDepthInterval].map(period => (
                      <button
                        key={period}
                        onClick={() => setBasketDepthPeriods(period)}
                        className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          basketDepthPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint'
                        }`}
                      >
                        {period} {basketDepthInterval === 'monthly' ? 'мес.' : basketDepthInterval === 'weekly' ? 'нед.' : 'дн.'}
                      </button>
                    ))}
                    {isBasketDepthFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
                  </div>

                  <BasketDepthChart
                    data={basketDepthSeries?.points || []}
                    interval={basketDepthInterval}
                    chartType="area"
                    isLoading={isBasketDepthLoading}
                  />
                </div>
              </div>

              {/* Top Customers */}
              {crmOverview?.topCustomers && crmOverview.topCustomers.length > 0 && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Топ клиентов</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">По доставленной выручке</p>
                  </div>

                  <div className="space-y-3">
                    {crmOverview.topCustomers.map(customer => (
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
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <div className="relative w-full sm:w-auto">
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
                  {isCrmUsersLoading && !crmUsers ? (
                    <div className="text-sm text-tg-hint text-center py-8">
                      Загружаем пользователей...
                    </div>
                  ) : crmUsersData.length === 0 ? (
                    <div className="text-sm text-tg-hint text-center py-10">
                      Пользователи не найдены
                    </div>
                  ) : (
                    <>
                      {crmUsersData.map(user => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className="w-full bg-tg-bg hover:bg-tg-bg/70 transition-colors rounded-2xl p-4 text-left"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-secondary-bg text-base font-semibold text-tg-text">
                                {user.name ? user.name[0]?.toUpperCase() : '#'}
                              </div>
                              <div>
                                <div className="text-base font-semibold text-tg-text">{buildUserTitle(user)}</div>
                                <div className="text-xs text-tg-hint flex flex-wrap gap-2">
                                  <span>ID: {user.telegramId}</span>
                                  {user.phone && <span>{user.phone}</span>}
                                  <span>Создан: {formatDateDisplay(user.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 text-sm">
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

                      {crmUsers && (
                        <ImprovedPagination
                          currentPage={crmUsers.page}
                          totalPages={crmUsers.totalPages || 1}
                          totalItems={crmUsers.total}
                          pageSize={crmPageSize}
                          onPageChange={setCrmPage}
                          isLoading={isCrmUsersFetching}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* LTV Metrics */}
              {ltvData && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    label="Средний LTV"
                    value={formatCurrency(ltvData.averageLTV)}
                    icon={TrendingUp}
                    accent="bg-emerald-500/10 text-emerald-400"
                    isLoading={isLTVLoading}
                  />
                  <MetricCard
                    label="Всего клиентов"
                    value={formatNumber(ltvData.totalCustomers)}
                    icon={Package}
                    accent="bg-blue-500/10 text-blue-400"
                    isLoading={isLTVLoading}
                  />
                  <MetricCard
                    label="LTV новых"
                    value={formatCurrency(ltvData.segments.new.avgLTV)}
                    icon={ShoppingBag}
                    accent="bg-purple-500/10 text-purple-400"
                    isLoading={isLTVLoading}
                  />
                  <MetricCard
                    label="LTV лояльных"
                    value={formatCurrency(ltvData.segments.loyal.avgLTV)}
                    icon={Coins}
                    accent="bg-yellow-500/10 text-yellow-400"
                    isLoading={isLTVLoading}
                  />
                </div>
              )}

              {/* LTV Segments */}
              {ltvData && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Сегментация по LTV</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Анализ клиентской базы</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Новые клиенты</div>
                      <div className="text-2xl font-bold text-tg-text mb-1">{formatNumber(ltvData.segments.new.count)}</div>
                      <div className="text-xs text-tg-hint">LTV: {formatCurrency(ltvData.segments.new.avgLTV)}</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Активные клиенты</div>
                      <div className="text-2xl font-bold text-tg-text mb-1">{formatNumber(ltvData.segments.active.count)}</div>
                      <div className="text-xs text-tg-hint">LTV: {formatCurrency(ltvData.segments.active.avgLTV)}</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Лояльные клиенты</div>
                      <div className="text-2xl font-bold text-tg-text mb-1">{formatNumber(ltvData.segments.loyal.count)}</div>
                      <div className="text-xs text-tg-hint">LTV: {formatCurrency(ltvData.segments.loyal.avgLTV)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {topProductsData && topProductsData.products.length > 0 && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Топ продуктов</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">По выручке за все время</p>
                  </div>
                  <div className="space-y-3">
                    {topProductsData.products.map((product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center gap-4 bg-tg-bg rounded-xl p-4"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-tg-secondary-bg rounded-lg flex items-center justify-center text-lg font-bold text-tg-text">
                          {index + 1}
                        </div>
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-tg-text truncate">{product.name}</div>
                          <div className="text-xs text-tg-hint">
                            Продано: {formatNumber(product.totalQuantity)} шт. · {formatNumber(product.ordersCount)} заказов
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-tg-text">{formatCurrency(product.totalRevenue)}</div>
                          <div className="text-xs text-tg-hint">Цена: {formatCurrency(product.currentPrice)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cohorts */}
              {cohortsData && cohortsData.cohorts.length > 0 && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Когортный анализ</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Группировка по месяцам регистрации</p>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      <div className="grid grid-cols-6 gap-2 p-3 bg-tg-bg rounded-xl mb-2 text-xs font-semibold text-tg-text">
                        <div>Когорта</div>
                        <div className="text-right">Пользователей</div>
                        <div className="text-right">Активных</div>
                        <div className="text-right">Выручка</div>
                        <div className="text-right">Средний чек</div>
                        <div className="text-right">Retention</div>
                      </div>
                      {cohortsData.cohorts.slice(0, 10).map((cohort) => (
                        <div
                          key={cohort.cohort}
                          className="grid grid-cols-6 gap-2 p-3 bg-tg-bg rounded-xl mb-2 text-sm"
                        >
                          <div className="font-medium text-tg-text">
                            {new Date(cohort.cohort + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-right text-tg-text">{formatNumber(cohort.usersCount)}</div>
                          <div className="text-right text-tg-text">{formatNumber(cohort.activeUsers)}</div>
                          <div className="text-right text-tg-text">{formatCurrency(cohort.totalRevenue)}</div>
                          <div className="text-right text-tg-text">{formatCurrency(cohort.averageOrderValue)}</div>
                          <div className="text-right text-tg-text">{cohort.retentionRate.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Conversion Metrics */}
              {metrics && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Метрики конверсии</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Эффективность бизнес-процессов</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Конверсия в покупателя</div>
                      <div className="text-2xl font-bold text-tg-text">
                        {metrics.totalUsers > 0 ? ((metrics.payingUsers / metrics.totalUsers) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-xs text-tg-hint mt-1">
                        {formatNumber(metrics.payingUsers)} из {formatNumber(metrics.totalUsers)}
                      </div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Активность (30 дней)</div>
                      <div className="text-2xl font-bold text-tg-text">
                        {metrics.totalUsers > 0 ? ((metrics.activeUsers30d / metrics.totalUsers) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-xs text-tg-hint mt-1">
                        {formatNumber(metrics.activeUsers30d)} из {formatNumber(metrics.totalUsers)}
                      </div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Средний чек</div>
                      <div className="text-2xl font-bold text-tg-text">{formatCurrency(metrics.averageOrderValue)}</div>
                      <div className="text-xs text-tg-hint mt-1">За период</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Глубина чека</div>
                      <div className="text-2xl font-bold text-tg-text">{(metrics.averageBasketDepth ?? 0).toFixed(2)}</div>
                      <div className="text-xs text-tg-hint mt-1">Товаров в среднем</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Repeat Purchase Analysis */}
              {repeatPurchaseAnalysis && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Анализ повторных покупок</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Лояльность клиентов</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Повторные покупатели</div>
                      <div className="text-2xl font-bold text-tg-text">{formatNumber(repeatPurchaseAnalysis.repeatBuyers)}</div>
                      <div className="text-xs text-tg-hint mt-1">
                        {repeatPurchaseAnalysis.repeatRate.toFixed(1)}% от всех покупателей
                      </div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Первичные покупатели</div>
                      <div className="text-2xl font-bold text-tg-text">{formatNumber(repeatPurchaseAnalysis.firstTimeBuyers)}</div>
                      <div className="text-xs text-tg-hint mt-1">Сделали только 1 заказ</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Среднее заказов</div>
                      <div className="text-2xl font-bold text-tg-text">
                        {repeatPurchaseAnalysis.averageOrdersPerRepeatBuyer.toFixed(2)}
                      </div>
                      <div className="text-xs text-tg-hint mt-1">У повторных покупателей</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Выручка от повторных</div>
                      <div className="text-2xl font-bold text-tg-text">
                        {formatCurrency(repeatPurchaseAnalysis.revenueFromRepeatBuyers)}
                      </div>
                      <div className="text-xs text-tg-hint mt-1">
                        {formatCurrency(repeatPurchaseAnalysis.revenueFromFirstTimeBuyers)} от первичных
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RFM Analysis */}
              {rfmAnalysis && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">RFM анализ</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Сегментация клиентов по поведению</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {rfmAnalysis.segments.map((segment) => (
                      <div key={segment.segment} className="bg-tg-bg rounded-xl p-4">
                        <div className="text-sm font-semibold text-tg-text mb-1">{segment.segment}</div>
                        <div className="text-xs text-tg-hint mb-3">{segment.description}</div>
                        <div className="text-xl font-bold text-tg-text mb-1">{formatNumber(segment.count)}</div>
                        <div className="text-xs text-tg-hint">
                          LTV: {formatCurrency(segment.avgRevenue)}
                        </div>
                        <div className="text-xs text-tg-hint">
                          Заказов: {segment.avgOrders.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Analysis */}
              {bonusAnalysis && (
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-tg-text">Анализ бонусов</h3>
                    <p className="text-xs sm:text-sm text-tg-hint">Эффективность программы лояльности</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Начислено</div>
                      <div className="text-2xl font-bold text-tg-text">{formatNumber(bonusAnalysis.earned)}</div>
                      <div className="text-xs text-tg-hint mt-1">бонусов всего</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Потрачено</div>
                      <div className="text-2xl font-bold text-tg-text">{formatNumber(bonusAnalysis.spent)}</div>
                      <div className="text-xs text-tg-hint mt-1">бонусов всего</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Активных</div>
                      <div className="text-2xl font-bold text-tg-text">{formatNumber(bonusAnalysis.active)}</div>
                      <div className="text-xs text-tg-hint mt-1">бонусов на балансах</div>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-4">
                      <div className="text-sm text-tg-hint mb-2">Использование</div>
                      <div className="text-2xl font-bold text-tg-text">{bonusAnalysis.utilizationRate.toFixed(1)}%</div>
                      <div className="text-xs text-tg-hint mt-1">от начисленных</div>
                    </div>
                  </div>
                  {bonusAnalysis.topEarners.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-tg-text mb-3">Топ получателей бонусов</div>
                      <div className="space-y-2">
                        {bonusAnalysis.topEarners.map((user, index) => (
                          <div key={user.userId} className="flex items-center justify-between bg-tg-bg rounded-xl p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-tg-secondary-bg rounded-lg flex items-center justify-center text-sm font-bold text-tg-text">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-tg-text">{user.name || `#${user.telegramId}`}</div>
                                <div className="text-xs text-tg-hint">ID: {user.telegramId}</div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-tg-text">{formatNumber(user.earned)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Time Analysis */}
              {orderTimeAnalysis && (
                <div className="grid xl:grid-cols-2 gap-5">
                  <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Заказы по часам</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Пиковые часы активности</p>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {orderTimeAnalysis.byHour.map((item) => (
                        <div key={item.hour} className="flex items-center justify-between bg-tg-bg rounded-xl p-3">
                          <div className="text-sm font-medium text-tg-text">
                            {item.hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-tg-hint">Заказов</div>
                              <div className="text-sm font-semibold text-tg-text">{formatNumber(item.ordersCount)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-tg-hint">Выручка</div>
                              <div className="text-sm font-semibold text-tg-text">{formatCurrency(item.revenue)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-5 space-y-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-tg-text">Заказы по дням недели</h3>
                      <p className="text-xs sm:text-sm text-tg-hint">Активность по дням</p>
                    </div>
                    <div className="space-y-2">
                      {orderTimeAnalysis.byDayOfWeek.map((item) => (
                        <div key={item.day} className="flex items-center justify-between bg-tg-bg rounded-xl p-3">
                          <div className="text-sm font-medium text-tg-text">{item.dayName}</div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-tg-hint">Заказов</div>
                              <div className="text-sm font-semibold text-tg-text">{formatNumber(item.ordersCount)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-tg-hint">Выручка</div>
                              <div className="text-sm font-semibold text-tg-text">{formatCurrency(item.revenue)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading States */}
              {(isLTVLoading || isCohortsLoading || isTopProductsLoading || isOrderTimeLoading || isBonusAnalysisLoading || isRepeatPurchaseLoading || isRFMLoading) && (
                <div className="bg-tg-secondary-bg rounded-2xl p-8 text-center text-tg-hint">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Загружаем аналитику...
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'broadcasts' && (
            <motion.div
              key="broadcasts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid lg:grid-cols-2 gap-6">
                <AudienceManager
                  selectedAudienceId={selectedAudienceId}
                  onSelectAudience={setSelectedAudienceId}
                />
                <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6">
                  <div className="mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-tg-text mb-2">Создать рассылку</h2>
                    <p className="text-sm text-tg-hint">
                      Отправьте сообщение выбранной аудитории с поддержкой медиафайлов и кнопок
                    </p>
                  </div>
                  <BroadcastForm
                    selectedAudienceId={selectedAudienceId}
                    onAudienceSelected={setSelectedAudienceId}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUserId && crmUserDetails && (
          <UserDetailsModal
            user={crmUserDetails}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
