import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, Building, MessageSquare, Calendar, Clock, Truck, ArrowLeft } from 'lucide-react';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { userApi } from '../api/user';
import { cartApi } from '../api/cart';
import { orderApi } from '../api/order';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// Константы для доставки
const DELIVERY_COST = 500;
const FREE_DELIVERY_THRESHOLD = 2500;

// Функция форматирования телефона
const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  let formatted = numbers;

  if (numbers.startsWith('8')) {
    formatted = '7' + numbers.slice(1);
  }

  if (formatted && !formatted.startsWith('7')) {
    formatted = '7' + formatted;
  }

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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/cart'), [navigate]);
  useTelegramBackButton(handleBack);

  // Загрузка данных пользователя и корзины
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  });

  const { data: cartData, isLoading: loadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  // Состояние формы
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [entrance, setEntrance] = useState('');
  const [comment, setComment] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [useNearestTime, setUseNearestTime] = useState(false);

  // Получаем текущую дату для минимального значения (один раз при загрузке)
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Отслеживание инициализации телефона
  const phoneInitialized = useRef(false);

  // Инициализация телефона из профиля (только один раз)
  useEffect(() => {
    if (userData?.user?.phone && !phoneInitialized.current) {
      setPhone(userData.user.phone);
      phoneInitialized.current = true;
    }
  }, [userData]);

  // Расчет стоимости
  const subtotal = cartData?.total || 0;
  const deliveryCost = useMemo(() => {
    return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  }, [subtotal]);
  const total = subtotal + deliveryCost;

  // Мутация создания заказа
  const createOrderMutation = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Заказ успешно оформлен!');
      navigate('/orders');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при оформлении заказа';
      toast.error(message);
    },
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const phoneNumbers = phone.replace(/\D/g, '');
    if (phoneNumbers.length !== 11) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    if (!street.trim()) {
      toast.error('Укажите улицу');
      return;
    }

    if (!house.trim()) {
      toast.error('Укажите номер дома');
      return;
    }

    if (!deliveryDate) {
      toast.error('Выберите дату доставки');
      return;
    }

    if (!useNearestTime && !deliveryTime) {
      toast.error('Выберите время доставки или "Ближайшее время"');
      return;
    }

    // Формирование адреса
    const fullAddress = `г. Хабаровск, ${street}, д. ${house}${apartment ? ', кв. ' + apartment : ''}${entrance ? ', подъезд ' + entrance : ''}`;

    // Создание заказа
    createOrderMutation.mutate({
      phone,
      deliveryAddress: fullAddress,
      deliveryDate,
      deliveryTime: useNearestTime ? 'Ближайшее время' : deliveryTime,
      comment: comment || undefined,
    });
  };

  if (loadingUser || loadingCart) {
    return <LoadingScreen />;
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-tg-hint mb-4">Корзина пуста</p>
          <button
            onClick={() => navigate('/catalog')}
            className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
          >
            Перейти в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/cart')}
            className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-tg-text">Оформление заказа</h1>
            <p className="text-sm text-tg-hint">
              {cartData.items.length} {cartData.items.length === 1 ? 'товар' : 'товара'}
            </p>
          </div>
        </motion.div>

        {/* Форма */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Контактная информация */}
          <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-tg-text flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Контактная информация
            </h2>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                Номер телефона *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                required
              />
            </div>
          </div>

          {/* Адрес доставки */}
          <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-tg-text flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Адрес доставки
            </h2>

            <div className="text-xs text-tg-hint bg-tg-bg p-2 rounded-xl">
              Доставка осуществляется только по г. Хабаровск
            </div>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                Улица *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Например: ул. Ленина"
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-tg-hint mb-2">
                  Дом *
                </label>
                <input
                  type="text"
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  placeholder="123"
                  className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-tg-hint mb-2">
                  Квартира
                </label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="45"
                  className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Подъезд
              </label>
              <input
                type="text"
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                placeholder="2"
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
              />
            </div>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Комментарий курьеру
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Домофон не работает, позвоните заранее..."
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Дата и время доставки */}
          <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-tg-text flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Дата и время доставки
            </h2>

            <div className="text-xs text-green-500 bg-tg-bg p-2 rounded-xl">
              Работаем 24/7 - доставим в любое удобное время
            </div>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                Дата доставки *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={today}
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-tg-hint mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Время доставки
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => {
                  setDeliveryTime(e.target.value);
                  setUseNearestTime(false);
                }}
                disabled={useNearestTime}
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setUseNearestTime(!useNearestTime);
                if (!useNearestTime) {
                  setDeliveryTime('');
                }
              }}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                useNearestTime
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-bg text-tg-text hover:bg-opacity-80'
              }`}
            >
              {useNearestTime ? '✓ ' : ''}Ближайшее время
            </button>
          </div>
        </motion.form>
      </div>

      {/* Bottom Bar - Итого и кнопка оформления */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-16 left-0 right-0 bg-tg-secondary-bg border-t border-tg-bg p-4"
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Подитог */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-tg-hint">Товары:</span>
            <span className="text-tg-text font-medium">
              {subtotal.toLocaleString()}₽
            </span>
          </div>

          {/* Доставка */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-tg-hint" />
              <span className="text-tg-hint">Доставка:</span>
            </div>
            <span className={`font-medium ${deliveryCost === 0 ? 'text-green-500' : 'text-tg-text'}`}>
              {deliveryCost === 0 ? 'Бесплатно' : `${deliveryCost.toLocaleString()}₽`}
            </span>
          </div>

          {/* Итого */}
          <div className="border-t border-tg-bg pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-tg-text font-semibold">Итого:</span>
              <span className="text-2xl font-bold text-tg-text">
                {total.toLocaleString()}₽
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending}
            className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createOrderMutation.isPending ? 'Оформление...' : 'Подтвердить заказ'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
