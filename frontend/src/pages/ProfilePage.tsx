import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Calendar, Clock, LogOut, Phone, Edit2, Check, X, Package, Gift, MessageCircle, Coins, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import toast from 'react-hot-toast';
import { userApi } from '../api/user';
import { bonusApi } from '../api/bonus';
import { useAuthStore } from '../store/authStore';
import LoadingScreen from '../components/LoadingScreen';
import { useState, useCallback } from 'react';
import { clearImageCache } from '../components/OptimizedImage';

// Функция форматирования телефона
const formatPhoneNumber = (value: string): string => {
  // Убираем все символы кроме цифр
  const numbers = value.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  let formatted = numbers;
  if (numbers.startsWith('8')) {
    formatted = '7' + numbers.slice(1);
  }
  
  // Если начинается не с 7, добавляем 7 в начало
  if (formatted && !formatted.startsWith('7')) {
    formatted = '7' + formatted;
  }
  
  // Форматируем номер
  if (formatted.length > 0) {
    let result = '+7';
    if (formatted.length > 1) {
      result += ' (' + formatted.slice(1, 4);
    }
    if (formatted.length >= 5) {
      result += ') ' + formatted.slice(4, 7);
    }
    if (formatted.length >= 8) {
      result += '-' + formatted.slice(7, 9);
    }
    if (formatted.length >= 10) {
      result += '-' + formatted.slice(9, 11);
    }
    return result;
  }
  
  return '';
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/'), [navigate]);
  useTelegramBackButton(handleBack);

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  });

  const { data: bonusData } = useQuery({
    queryKey: ['bonus'],
    queryFn: bonusApi.getBonusInfo,
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (phone: string) => userApi.updateProfile({ phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Номер телефона обновлен');
      setIsEditingPhone(false);
    },
    onError: () => {
      toast.error('Ошибка обновления номера');
    },
  });

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из аккаунта');
    navigate('/auth');
  };

  const handleEditPhone = () => {
    setPhoneValue(data?.user?.phone || '');
    setIsEditingPhone(true);
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneValue(formatted);
  };

  const handleSavePhone = () => {
    // Проверяем что номер полный
    const numbers = phoneValue.replace(/\D/g, '');
    if (numbers.length !== 11) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    updatePhoneMutation.mutate(phoneValue);
  };

  const handleCancelEdit = () => {
    setIsEditingPhone(false);
    setPhoneValue('');
  };

  const handleClearImageCache = () => {
    clearImageCache();
    toast.success('Кэш изображений очищен');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-tg-bg">
        <div className="text-center">
          <p className="text-red-500 mb-4">Ошибка загрузки профиля</p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  const profile = data?.user;

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-tg-text">Профиль</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-tg-secondary-bg transition-colors"
          >
            <LogOut className="w-5 h-5 text-tg-hint" />
          </motion.button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-tg-secondary-bg rounded-3xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-4 mb-6">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-tg-button flex items-center justify-center">
                <User className="w-10 h-10 text-tg-button-text" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-tg-text">
                {profile?.firstName || profile?.username || 'Пользователь'}
                {profile?.lastName && ` ${profile.lastName}`}
              </h2>
              {profile?.username && (
                <p className="text-tg-hint">@{profile.username}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Phone Field */}
            <div 
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                !isEditingPhone ? 'hover:bg-tg-bg cursor-pointer' : ''
              }`}
              onClick={() => !isEditingPhone && handleEditPhone()}
            >
              <div className="text-tg-hint">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-tg-hint">Телефон</p>
                {isEditingPhone ? (
                  <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={handlePhoneChange}
                      placeholder="+7 (999) 123-45-67"
                      className="flex-1 px-3 py-1.5 bg-tg-bg text-tg-text rounded-lg outline-none focus:ring-2 focus:ring-tg-button text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={updatePhoneMutation.isPending}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updatePhoneMutation.isPending}
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-tg-text font-medium mt-1">
                    {profile?.phone || 'Не указан'}
                  </p>
                )}
              </div>
            </div>

            <InfoRow
              icon={<User className="w-5 h-5" />}
              label="Telegram ID"
              value={profile?.telegramId || '-'}
            />
            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="Дата регистрации"
              value={
                profile?.createdAt
                  ? format(new Date(profile.createdAt), 'dd MMMM yyyy', { locale: ru })
                  : '-'
              }
            />
            <InfoRow
              icon={<Clock className="w-5 h-5" />}
              label="Последний вход"
              value={
                profile?.lastLoginAt
                  ? format(new Date(profile.lastLoginAt), "dd MMMM yyyy, HH:mm", { locale: ru })
                  : '-'
              }
            />
            {bonusData && (
              <InfoRow
                icon={<Coins className="w-5 h-5" />}
                label="Бонусный баланс"
                value={`${bonusData.balance.toLocaleString()} ₽`}
              />
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <ActionButton
            icon={<Package className="w-5 h-5" />}
            label="Мои заказы"
            description="История покупок"
            onClick={() => navigate('/orders')}
            color="blue"
          />
          <ActionButton
            icon={<Gift className="w-5 h-5" />}
            label="Бонусная программа"
            description="Скидки и бонусы"
            onClick={() => navigate('/bonus')}
            color="green"
          />
          <ActionButton
            icon={<MessageCircle className="w-5 h-5" />}
            label="Поддержка"
            description="Связаться с нами"
            onClick={() => {
              // Открыть ссылку в Telegram
              window.open(import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_URL, '_blank');
            }}
            color="purple"
          />
          <ActionButton
            icon={<Trash2 className="w-5 h-5" />}
            label="Очистить кэш изображений"
            description="Для отладки загрузки картинок"
            onClick={handleClearImageCache}
            color="orange"
          />
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-tg-bg transition-colors">
      <div className="text-tg-hint">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-tg-hint">{label}</p>
        <p className="text-tg-text font-medium">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
  color = 'purple'
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-tg-secondary-bg rounded-2xl p-4 flex items-center gap-4 hover:bg-opacity-80 transition-all"
    >
      <div className={`p-3 rounded-xl text-white ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-tg-text font-semibold">{label}</h3>
        <p className="text-sm text-tg-hint">{description}</p>
      </div>
      <Edit2 className="w-5 h-5 text-tg-hint" />
    </motion.button>
  );
}

