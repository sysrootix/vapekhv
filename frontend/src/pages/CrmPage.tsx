import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Loader2,
  Search,
  ChevronDown,
  Users,
  TrendingUp,
  BarChart3,
  Gift,
  Coins,
  ArrowLeft,
  ArrowRight,
  Clock,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingScreen from '../components/LoadingScreen';
import {
  adminApi,
  AdminAccess,
  CrmOverview,
  RevenueSeries,
  CrmUsersResponse,
  CrmUserDetails,
  NewUsersSeries,
  UpdateCrmUserPayload,
} from '../api/admin';

type IntervalOption = 'daily' | 'weekly' | 'monthly';
type CrmSortOption = 'spent_desc' | 'spent_asc' | 'newest' | 'oldest' | 'last_active' | 'bonuses_desc';

type UserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  bonusPoints: string;
};

const crmRangeOptions = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: '180 дней', value: 180 },
] as const;

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

const formatDate = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatPeriodLabel = (interval: IntervalOption, start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (interval === 'monthly') {
    return startDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  if (interval === 'weekly') {
    return `${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} — ${new Date(
      endDate.getTime() - 86400000
    ).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
  }

  return startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const buildUserTitle = (user: CrmUsersResponse['items'][number]) => {
  if (user.name) return user.name;
  if (user.username) return `@${user.username}`;
  return `#${user.telegramId}`;
};

const normalizeInput = (value: string) => value.trim();

export default function CrmPage() {
  const queryClient = useQueryClient();

  const [crmRangeDays, setCrmRangeDays] = useState<number>(30);
  const [crmInterval, setCrmInterval] = useState<IntervalOption>('daily');
  const [crmPeriods, setCrmPeriods] = useState<number>(14);
  const [crmSearchInput, setCrmSearchInput] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSort, setCrmSort] = useState<CrmSortOption>('spent_desc');
  const [crmPage, setCrmPage] = useState(1);
  const crmPageSize = 20;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [newUsersInterval, setNewUsersInterval] = useState<IntervalOption>('daily');
  const [newUsersPeriods, setNewUsersPeriods] = useState<number>(14);

  const [userForm, setUserForm] = useState<UserFormState>({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    bonusPoints: '',
  });
  const [userFormInitial, setUserFormInitial] = useState<UserFormState | null>(null);

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

  const { data: access, isLoading: isAccessLoading } = useQuery<AdminAccess>({
    queryKey: ['admin-access'],
    queryFn: adminApi.getAccess,
  });

  const canViewCrm = Boolean(access?.permissions.viewCrm);

  const {
    data: crmOverview,
    isLoading: isOverviewLoading,
    isFetching: isOverviewFetching,
  } = useQuery<CrmOverview>({
    queryKey: ['crm-overview', crmRangeDays],
    queryFn: () => adminApi.getCrmOverview(crmRangeDays),
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
    isLoading: isCrmUserDetailsLoading,
  } = useQuery<CrmUserDetails>({
    queryKey: ['crm-user', selectedUserId],
    queryFn: () => adminApi.getCrmUserDetails(selectedUserId!),
    enabled: Boolean(selectedUserId),
  });

  useEffect(() => {
    if (crmUserDetails) {
      const initial: UserFormState = {
        firstName: crmUserDetails.user.firstName ?? '',
        lastName: crmUserDetails.user.lastName ?? '',
        username: crmUserDetails.user.username ?? '',
        phone: crmUserDetails.user.phone ?? '',
        bonusPoints: crmUserDetails.user.bonusPoints.toString(),
      };
      setUserForm(initial);
      setUserFormInitial(initial);
    }
  }, [
    crmUserDetails?.user.firstName,
    crmUserDetails?.user.lastName,
    crmUserDetails?.user.username,
    crmUserDetails?.user.phone,
    crmUserDetails?.user.bonusPoints,
  ]);

  const updateCrmUserMutation = useMutation({
    mutationFn: (payload: UpdateCrmUserPayload) => adminApi.updateCrmUser(selectedUserId!, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['crm-user', selectedUserId], data);
      queryClient.invalidateQueries({ queryKey: ['crm-users'] });
      toast.success('Данные пользователя обновлены');

      const refreshed: UserFormState = {
        firstName: data.user.firstName ?? '',
        lastName: data.user.lastName ?? '',
        username: data.user.username ?? '',
        phone: data.user.phone ?? '',
        bonusPoints: data.user.bonusPoints.toString(),
      };
      setUserForm(refreshed);
      setUserFormInitial(refreshed);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось обновить пользователя');
    },
  });

  const formChanged =
    userFormInitial !== null && JSON.stringify(userFormInitial) !== JSON.stringify(userForm);

  const handleUserFormSubmit = () => {
    if (!selectedUserId || !crmUserDetails) return;
    const bonusValue = Number(userForm.bonusPoints);
    if (Number.isNaN(bonusValue)) {
      toast.error('Введите корректное количество бонусов');
      return;
    }

    const payload: UpdateCrmUserPayload = {
      firstName: normalizeInput(userForm.firstName) || null,
      lastName: normalizeInput(userForm.lastName) || null,
      username: normalizeInput(userForm.username) || null,
      phone: normalizeInput(userForm.phone) || null,
      bonusPoints: Math.round(bonusValue),
    };

    updateCrmUserMutation.mutate(payload);
  };

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

  const crmUsersData = crmUsers?.items ?? [];
  const hasCrmUsers = crmUsersData.length > 0;
  const newUsersPoints = newUsersSeries?.points ?? [];

  return (
    <div className="min-h-screen bg-tg-bg pb-6">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 bg-tg-secondary-bg rounded-xl">
            <Shield className="w-6 h-6 text-tg-button" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-tg-text">CRM-панель</h1>
            <p className="text-sm text-tg-hint">Аналитика выручки и подробная информация о клиентах</p>
          </div>
        </motion.div>

        <section className="bg-tg-secondary-bg rounded-3xl p-6 space-y-6 border border-transparent">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {crmRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setCrmRangeDays(option.value)}
                  className={`
                    px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${crmRangeDays === option.value ? 'bg-tg-button text-tg-button-text' : 'bg-tg-bg text-tg-hint hover:bg-opacity-80'}
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
                  <div key={card.label} className="bg-tg-bg rounded-2xl p-5 space-y-3 border border-transparent hover:border-tg-button/30 transition-colors">
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
            <div className="bg-tg-bg rounded-2xl p-8 text-center text-tg-hint">
              {isOverviewLoading ? 'Загружаем статистику...' : 'Нет данных для указанного периода'}
            </div>
          )}

          <div className="grid xl:grid-cols-2 gap-5">
            <div className="bg-tg-bg rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-tg-text">Динамика выручки</h3>
                  <p className="text-sm text-tg-hint">Сумма доставленных заказов и их количество</p>
                </div>
                <div className="flex items-center gap-2">
                  {intervalOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => setCrmInterval(option)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                        crmInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'
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
                      crmPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'
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
                          <div className="h-2 bg-tg-secondary-bg rounded-full overflow-hidden">
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

            <div className="bg-tg-bg rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-tg-text">Новые пользователи</h3>
                  <p className="text-sm text-tg-hint">Количество регистраций за выбранный период</p>
                </div>
                <div className="flex items-center gap-2">
                  {intervalOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => setNewUsersInterval(option)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wide transition-all ${
                        newUsersInterval === option ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      newUsersPeriods === period ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'
                    }`}
                  >
                    {period} {newUsersInterval === 'monthly' ? 'мес.' : newUsersInterval === 'weekly' ? 'нед.' : 'дн.'}
                  </button>
                ))}
                {isNewUsersFetching && <Loader2 className="w-4 h-4 animate-spin text-tg-hint" />}
              </div>

              <div className="space-y-3">
                {isNewUsersLoading && (
                  <div className="flex items-center justify-center py-10 text-tg-hint text-sm">
                    Загружаем динамику...
                  </div>
                )}
                {!isNewUsersLoading && newUsersPoints.length > 0 ? (
                  <div className="space-y-4">
                    {newUsersPoints.map(point => {
                      const maxUsers = Math.max(...newUsersPoints.map(p => p.usersCount));
                      const barPercent = maxUsers > 0 ? Math.round((point.usersCount / maxUsers) * 100) : 0;
                      return (
                        <div key={point.periodStart} className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-tg-hint">
                            <span>{formatPeriodLabel(newUsersInterval, point.periodStart, point.periodEnd)}</span>
                            <span>{point.usersCount} новых</span>
                          </div>
                          <div className="h-2 bg-tg-secondary-bg rounded-full overflow-hidden">
                            <div
                              style={{ width: `${barPercent}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-400 transition-all"
                            />
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
          </div>

          <div className="bg-tg-bg rounded-2xl p-5 space-y-4">
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
                    className="w-full flex items-center justify-between gap-3 bg-tg-secondary-bg hover:bg-tg-secondary-bg/70 transition-colors rounded-xl p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tg-bg text-sm font-semibold text-tg-text">
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

          <div className="bg-tg-bg rounded-2xl p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
                <input
                  type="text"
                  value={crmSearchInput}
                  onChange={(e) => setCrmSearchInput(e.target.value)}
                  placeholder="Поиск по имени, телефону, Telegram ID..."
                  className="w-full pl-12 pr-4 py-3 bg-tg-secondary-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
                />
              </div>
              <div className="relative w-full lg:w-auto">
                <select
                  value={crmSort}
                  onChange={(e) => {
                    setCrmSort(e.target.value as CrmSortOption);
                    setCrmPage(1);
                  }}
                  className="w-full appearance-none px-4 py-3 bg-tg-secondary-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
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
              {isCrmUsersLoading && (
                <div className="text-sm text-tg-hint text-center py-8">
                  Загружаем пользователей...
                </div>
              )}

              {!isCrmUsersLoading && crmUsers && (
                <div className="space-y-3">
                  {crmUsersData.length === 0 ? (
                    <div className="text-sm text-tg-hint text-center py-10">
                      Пользователи не найдены
                    </div>
                  ) : (
                    crmUsersData.map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className="w-full bg-tg-secondary-bg hover:bg-tg-secondary-bg/70 transition-colors rounded-2xl p-4 text-left"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-bg text-base font-semibold text-tg-text">
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
                    ))
                  )}

                  {hasCrmUsers && (
                    <div className="flex items-center justify-between text-sm text-tg-hint pt-2">
                      <div>
                        Стр. {crmUsers?.page} из {crmUsers?.totalPages || 1} · всего {crmUsers?.total} пользователей
                        {isCrmUsersFetching && <Loader2 className="w-4 h-4 inline-block ml-2 animate-spin" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCrmPage(prev => Math.max(prev - 1, 1))}
                          disabled={!crmUsers?.hasPrevPage}
                          className="p-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCrmPage(prev => prev + 1)}
                          disabled={!crmUsers?.hasNextPage}
                          className="p-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
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
                          <h4 className="text-sm font-semibold text-tg-text">Изменить данные</h4>
                          <div className="bg-tg-bg rounded-2xl p-4 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-tg-hint block mb-1">Имя</label>
                                <input
                                  type="text"
                                  value={userForm.firstName}
                                  onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-tg-hint block mb-1">Фамилия</label>
                                <input
                                  type="text"
                                  value={userForm.lastName}
                                  onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
                                />
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-tg-hint block mb-1">Username</label>
                                <input
                                  type="text"
                                  value={userForm.username}
                                  onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                                  placeholder="@username"
                                  className="w-full px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-tg-hint block mb-1">Телефон</label>
                                <input
                                  type="tel"
                                  value={userForm.phone}
                                  onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="+7..."
                                  className="w-full px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-tg-hint block mb-1">Бонусы</label>
                              <input
                                type="number"
                                value={userForm.bonusPoints}
                                onChange={(e) => setUserForm(prev => ({ ...prev, bonusPoints: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text outline-none focus:ring-2 focus:ring-tg-button"
                              />
                            </div>

                            <button
                              onClick={handleUserFormSubmit}
                              disabled={!formChanged || updateCrmUserMutation.isPending}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-tg-button text-tg-button-text font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {updateCrmUserMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Сохраняем...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Сохранить изменения
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-tg-text">Недавние заказы</h4>
                          <div className="bg-tg-bg rounded-2xl p-4 space-y-2">
                            {crmUserDetails.recentOrders.length ? (
                              crmUserDetails.recentOrders.map(order => (
                                <div key={order.id} className="bg-tg-secondary-bg rounded-xl p-3 space-y-1 text-sm">
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
                                      <span key={`${item.productId}-${item.name}`} className="px-2 py-1 rounded-lg bg-tg-bg">
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
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-tg-text">История бонусов</h4>
                        <div className="bg-tg-bg rounded-2xl p-4 space-y-2">
                          {crmUserDetails.bonusHistory.length ? (
                            crmUserDetails.bonusHistory.map(tx => (
                              <div key={tx.id} className="bg-tg-secondary-bg rounded-xl p-3 text-sm">
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
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
