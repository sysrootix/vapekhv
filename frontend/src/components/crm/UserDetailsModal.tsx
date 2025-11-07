import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Package, Gift, Edit, X, Users, Save, Loader2 } from 'lucide-react';
import { CrmUserDetails, UpdateCrmUserPayload } from '../../api/admin';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

type TabId = 'overview' | 'orders' | 'bonuses' | 'edit';

interface UserDetailsModalProps {
  user: CrmUserDetails;
  onClose: () => void;
}

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

export function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [userForm, setUserForm] = useState({
    firstName: user.user.firstName ?? '',
    lastName: user.user.lastName ?? '',
    username: user.user.username ?? '',
    phone: user.user.phone ?? '',
    bonusPoints: user.user.bonusPoints.toString(),
  });
  const [userFormInitial] = useState({
    firstName: user.user.firstName ?? '',
    lastName: user.user.lastName ?? '',
    username: user.user.username ?? '',
    phone: user.user.phone ?? '',
    bonusPoints: user.user.bonusPoints.toString(),
  });

  const updateCrmUserMutation = useMutation({
    mutationFn: (payload: UpdateCrmUserPayload) => adminApi.updateCrmUser(user.user.id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['crm-user', user.user.id], data);
      queryClient.invalidateQueries({ queryKey: ['crm-users'] });
      toast.success('Данные пользователя обновлены');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось обновить пользователя');
    },
  });

  const formChanged = JSON.stringify(userFormInitial) !== JSON.stringify(userForm);

  const handleUserFormSubmit = () => {
    const bonusValue = Number(userForm.bonusPoints);
    if (Number.isNaN(bonusValue)) {
      toast.error('Введите корректное количество бонусов');
      return;
    }

    const payload: UpdateCrmUserPayload = {
      firstName: userForm.firstName.trim() || null,
      lastName: userForm.lastName.trim() || null,
      username: userForm.username.trim() || null,
      phone: userForm.phone.trim() || null,
      bonusPoints: Math.round(bonusValue),
    };

    updateCrmUserMutation.mutate(payload);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const tabs = [
    { id: 'overview' as TabId, label: 'Обзор', icon: User },
    { id: 'orders' as TabId, label: 'Заказы', icon: Package },
    { id: 'bonuses' as TabId, label: 'Бонусы', icon: Gift },
    { id: 'edit' as TabId, label: 'Редактировать', icon: Edit },
  ];

  const userName = user.user.firstName || user.user.lastName
    ? `${user.user.firstName ?? ''} ${user.user.lastName ?? ''}`.trim()
    : user.user.username
      ? `@${user.user.username}`
      : `#${user.user.telegramId}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        className="max-w-3xl w-full bg-tg-secondary-bg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-tg-button/10 flex items-start justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tg-bg rounded-full text-xs text-tg-hint">
              <Users className="w-3 h-3" />
              Клиент #{user.user.telegramId}
            </div>
            <h2 className="text-2xl font-bold text-tg-text">{userName}</h2>
            <div className="text-sm text-tg-hint space-y-1">
              <div>Профиль создан: {formatDateDisplay(user.user.createdAt)}</div>
              {user.user.phone && <div>Телефон: {user.user.phone}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-tg-bg text-tg-text hover:bg-opacity-80 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-tg-button/10 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'border-tg-button text-tg-button' 
                    : 'border-transparent text-tg-hint hover:text-tg-text'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-tg-bg rounded-2xl p-4">
                    <div className="text-xs text-tg-hint uppercase mb-1">Выручка</div>
                    <div className="text-lg font-semibold text-tg-text">
                      {formatCurrency(user.stats.deliveredRevenue)}
                    </div>
                    <div className="text-xs text-tg-hint">
                      {user.stats.deliveredOrders} доставленных заказов
                    </div>
                  </div>
                  <div className="bg-tg-bg rounded-2xl p-4">
                    <div className="text-xs text-tg-hint uppercase mb-1">Средний чек</div>
                    <div className="text-lg font-semibold text-tg-text">
                      {formatCurrency(user.stats.averageOrderValue || 0)}
                    </div>
                    <div className="text-xs text-tg-hint">
                      Всего заказов: {user.stats.totalOrders}
                    </div>
                  </div>
                  <div className="bg-tg-bg rounded-2xl p-4">
                    <div className="text-xs text-tg-hint uppercase mb-1">Бонусы</div>
                    <div className="text-lg font-semibold text-tg-text">
                      {formatNumber(user.user.bonusPoints)} б.
                    </div>
                    <div className="text-xs text-tg-hint">
                      Начислено: {formatNumber(user.stats.totalBonusEarned)} б.
                    </div>
                  </div>
                  <div className="bg-tg-bg rounded-2xl p-4">
                    <div className="text-xs text-tg-hint uppercase mb-1">Активность</div>
                    <div className="text-lg font-semibold text-tg-text">
                      {user.stats.lastOrderAt ? formatDateDisplay(user.stats.lastOrderAt) : '—'}
                    </div>
                    <div className="text-xs text-tg-hint">
                      Первый заказ: {user.stats.firstOrderAt ? formatDateDisplay(user.stats.firstOrderAt) : '—'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h3 className="text-lg font-semibold text-tg-text">Недавние заказы</h3>
                <div className="space-y-2">
                  {user.recentOrders.length ? (
                    user.recentOrders.map(order => (
                      <div key={order.id} className="bg-tg-bg rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-tg-text">#{order.orderNumber}</div>
                          <div className="text-xs text-tg-hint">{new Date(order.createdAt).toLocaleString('ru-RU')}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-tg-text">
                          <span>{order.status}</span>
                          <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
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
                    <div className="text-sm text-tg-hint py-8 text-center bg-tg-bg rounded-xl">Заказов пока нет</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'bonuses' && (
              <motion.div
                key="bonuses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h3 className="text-lg font-semibold text-tg-text">История бонусов</h3>
                <div className="space-y-2">
                  {user.bonusHistory.length ? (
                    user.bonusHistory.map(tx => (
                      <div key={tx.id} className="bg-tg-bg rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-tg-text">{tx.type}</span>
                          <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                        </div>
                        {tx.description && (
                          <div className="text-xs text-tg-hint mb-1">{tx.description}</div>
                        )}
                        <div className="text-xs text-tg-hint">
                          {new Date(tx.createdAt).toLocaleString('ru-RU')}
                          {tx.orderId && ` · Заказ ${tx.orderId.slice(0, 6)}...`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-tg-hint py-8 text-center bg-tg-bg rounded-xl">История бонусов пока пуста</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'edit' && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-tg-text">Изменить данные</h3>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

