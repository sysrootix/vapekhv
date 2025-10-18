import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, Building, MessageSquare, Calendar, Clock, Truck, ArrowLeft, RotateCcw, Gift, Tag } from 'lucide-react';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { userApi } from '../api/user';
import { cartApi } from '../api/cart';
import { orderApi, ApplyPromoResponse } from '../api/order';
import { bonusApi } from '../api/bonus';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MIN_ORDER_AMOUNT, calculateDeliveryCost, getDeliveryProgress } from '../utils/shipping';

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

  // Загрузка предыдущих заказов для автозаполнения
  const { data: previousOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: orderApi.getOrders,
  });

  // Загрузка информации о бонусах
  const { data: bonusInfo } = useQuery({
    queryKey: ['bonus'],
    queryFn: bonusApi.getBonusInfo,
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
  const [useBonuses, setUseBonuses] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [promoInput, setPromoInput] = useState('');
  const [promoSummary, setPromoSummary] = useState<ApplyPromoResponse | null>(null);

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

  useEffect(() => {
    if (!cartData || cartData.items.length === 0) {
      setPromoSummary(null);
      setPromoInput('');
    }
  }, [cartData]);

  // Функция автозаполнения из последнего заказа
  const fillFromLastOrder = useCallback(() => {
    if (!previousOrders || previousOrders.length === 0) {
      toast.error('Нет предыдущих заказов');
      return;
    }

    const lastOrder = previousOrders[0];

    // Парсинг адреса
    if (lastOrder.deliveryAddress) {
      // Формат: "г. Хабаровск, ул. Ленина, д. 123, кв. 45, подъезд 2"
      const addressMatch = lastOrder.deliveryAddress.match(/г\. Хабаровск,\s*(.+?),\s*д\.\s*(\S+)(?:,\s*кв\.\s*(\S+))?(?:,\s*подъезд\s*(\S+))?/);

      if (addressMatch) {
        setStreet(addressMatch[1] || '');
        setHouse(addressMatch[2] || '');
        setApartment(addressMatch[3] || '');
        setEntrance(addressMatch[4] || '');
      }
    }

    // Телефон
    if (lastOrder.deliveryPhone) {
      setPhone(lastOrder.deliveryPhone);
    }

    // Комментарий можно не заполнять автоматически

    toast.success('Данные из последнего заказа заполнены');
  }, [previousOrders]);

  // Расчет стоимости с учетом бонусов
  const subtotal = cartData?.total || 0;
  const baseDeliveryCost = useMemo(() => calculateDeliveryCost(subtotal), [subtotal]);
  const deliveryProgress = useMemo(() => getDeliveryProgress(subtotal), [subtotal]);
  const deliveryCost = promoSummary ? promoSummary.pricing.deliveryCost : baseDeliveryCost;
  const promoDiscount = promoSummary?.promo.discount ?? 0;
  const promoBonusReward = promoSummary?.promo.bonus ?? 0;
  const promoCodeValue = promoSummary?.promo.code ?? '';
  const canSubmit = subtotal >= MIN_ORDER_AMOUNT;
  const nextStepLabel = deliveryProgress.nextStep
    ? deliveryProgress.nextStep.cost === 0
      ? 'бесплатной доставки'
      : `доставки за ${deliveryProgress.nextStep.cost}₽`
    : null;

  const totalBeforeBonuses = subtotal + deliveryCost - promoDiscount;
  const availableBonuses = bonusInfo?.balance || 0;
  const maxBonusUsage = Math.floor(Math.max(totalBeforeBonuses, 0) * 0.5); // Максимум 50% от суммы
  const maxBonusToUse = Math.min(availableBonuses, maxBonusUsage);

  const bonusDiscount = useBonuses ? Math.min(bonusAmount, maxBonusToUse) : 0;
  const total = Math.max(totalBeforeBonuses - bonusDiscount, 0);

  // Мутация создания заказа
  const createOrderMutation = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Заказ успешно создан! Переходим к оплате...');
      // Перенаправляем на страницу оплаты
      navigate(`/payment/${order.id}`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при оформлении заказа';
      toast.error(message);
    },
  });

  const applyPromoMutation = useMutation({
    mutationFn: (code: string) => orderApi.applyPromo(code),
    onSuccess: (response) => {
      setPromoSummary(response);
      setPromoInput(response.promo.code);
      toast.success('Промокод применён');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Не удалось применить промокод';
      toast.error(message);
    },
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleApplyPromo = () => {
    const trimmed = promoInput.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Введите промокод');
      return;
    }
    applyPromoMutation.mutate(trimmed);
  };

  const handleRemovePromo = () => {
    setPromoSummary(null);
    setPromoInput('');
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

    // Если не "Ближайшее время", нужны дата и время
    if (!useNearestTime) {
      if (!deliveryDate) {
        toast.error('Выберите дату доставки');
        return;
      }

      if (!deliveryTime) {
        toast.error('Выберите время доставки');
        return;
      }
    }

    // Формирование адреса
    const fullAddress = `г. Хабаровск, ${street}, д. ${house}${apartment ? ', кв. ' + apartment : ''}${entrance ? ', подъезд ' + entrance : ''}`;

    // Создание заказа
    if (!canSubmit) {
      toast.error(`Минимальная сумма заказа ${MIN_ORDER_AMOUNT.toLocaleString('ru-RU')}₽`);
      return;
    }

    createOrderMutation.mutate({
      phone,
      deliveryAddress: fullAddress,
      deliveryDate: useNearestTime ? today : deliveryDate,
      deliveryTime: useNearestTime ? 'Ближайшее время' : deliveryTime,
      comment: comment || undefined,
      bonusToUse: bonusDiscount,
      promoCode: promoSummary?.promo.code,
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
    <div className="min-h-screen bg-tg-bg pb-24">
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
          {/* Кнопка автозаполнения */}
          {previousOrders && previousOrders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-tg-secondary-bg rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-tg-text">Быстрое оформление</h3>
                  <p className="text-xs text-tg-hint">Используйте данные из прошлого заказа</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fillFromLastOrder}
                className="w-full bg-tg-button text-tg-button-text py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Заполнить данные
              </button>
            </motion.div>
          )}

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

            <button
              type="button"
              onClick={() => {
                const newValue = !useNearestTime;
                setUseNearestTime(newValue);
                if (newValue) {
                  setDeliveryTime('');
                  setDeliveryDate(today);
                }
              }}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                useNearestTime
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-bg text-tg-text hover:bg-opacity-80'
              }`}
            >
              {useNearestTime ? '✓ ' : ''}Ближайшее время
            </button>

            {!useNearestTime && (
              <>
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
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button"
                  />
                </div>
              </>
            )}
          </div>
        </motion.form>

        {/* Промокод */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-tg-text">Промокод</h3>
            </div>
            {promoSummary && (
              <button
                type="button"
                onClick={handleRemovePromo}
                className="text-xs text-purple-300 hover:text-purple-100 transition"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Введите код"
              className="flex-1 px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button uppercase"
              disabled={applyPromoMutation.isPending}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={applyPromoMutation.isPending}
              className="px-4 py-3 rounded-xl bg-tg-button text-tg-button-text font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {applyPromoMutation.isPending ? '...' : promoSummary ? 'Обновить' : 'Применить'}
            </button>
          </div>

          {promoSummary && (
            <div className="bg-tg-bg rounded-xl p-3 space-y-2 text-sm text-tg-text">
              <div className="flex items-center justify-between">
                <span>Скидка по коду</span>
                <span className={`font-medium ${promoDiscount > 0 ? 'text-green-500' : 'text-tg-text'}`}>
                  {promoDiscount > 0 ? `-${promoDiscount.toLocaleString('ru-RU')}₽` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Доставка</span>
                <span className={deliveryCost === 0 ? 'text-green-500 font-medium' : 'text-tg-text font-medium'}>
                  {deliveryCost === 0 ? 'Бесплатно' : `${deliveryCost.toLocaleString('ru-RU')}₽`}
                </span>
              </div>
              {promoBonusReward > 0 && (
                <div className="flex items-center justify-between">
                  <span>Доп. бонусы после доставки</span>
                  <span className="text-green-500 font-medium">
                    +{promoBonusReward.toLocaleString('ru-RU')}₽
                  </span>
                </div>
              )}
              <p className="text-xs text-tg-hint">
                Код {promoCodeValue} активирован. Бонусы начисляются после доставки заказа.
              </p>
              {promoSummary.promo.description && (
                <p className="text-xs text-tg-hint">
                  {promoSummary.promo.description}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Бонусы */}
        {availableBonuses > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-tg-text">Бонусы</h3>
              </div>
              <span className="text-sm text-tg-hint">
                Доступно: {availableBonuses} б.
              </span>
            </div>

            <div className="text-xs text-tg-hint bg-tg-bg p-2 rounded-xl">
              Вы можете списать до 50% от стоимости заказа (максимум {maxBonusToUse} бонусов)
            </div>

            <button
              type="button"
              onClick={() => {
                const newValue = !useBonuses;
                setUseBonuses(newValue);
                if (newValue) {
                  setBonusAmount(maxBonusToUse);
                } else {
                  setBonusAmount(0);
                }
              }}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                useBonuses
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-bg text-tg-text hover:bg-opacity-80'
              }`}
            >
              {useBonuses ? '✓ ' : ''}Использовать бонусы
            </button>

            {useBonuses && (
              <div className="space-y-2">
                <label className="block text-sm text-tg-hint">
                  Количество бонусов для списания:
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxBonusToUse}
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(Number(e.target.value))}
                  className="w-full accent-tg-button"
                />
                <div className="flex items-center justify-between text-sm">
                  <input
                    type="number"
                    min="0"
                    max={maxBonusToUse}
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(Math.min(Number(e.target.value), maxBonusToUse))}
                    className="w-24 px-3 py-2 bg-tg-bg text-tg-text rounded-lg outline-none focus:ring-2 focus:ring-tg-button"
                  />
                  <span className="text-green-500 font-medium">
                    -{bonusAmount.toLocaleString()}₽
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Итого и кнопка оформления */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3"
        >
          <div className="bg-tg-bg rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-tg-hint font-semibold">
              <span>
                {deliveryProgress.minOrderReached
                  ? deliveryProgress.currentStep?.label ?? 'Минимальный заказ'
                  : 'Минимальный заказ 1000₽'}
              </span>
              <span>{deliveryProgress.nextStep?.label ?? 'Лучшие условия'}</span>
            </div>
            <div className="h-2 bg-tg-secondary-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-500"
                style={{ width: `${deliveryProgress.progressPercent * 100}%` }}
              />
            </div>
            <div className="text-xs text-tg-hint">
              {!deliveryProgress.minOrderReached && (
                <>Добавьте товаров на {deliveryProgress.amountToNext.toLocaleString()}₽, чтобы оформить заказ.</>
              )}
              {deliveryProgress.minOrderReached && nextStepLabel && (
                <>Добавьте товаров на {deliveryProgress.amountToNext.toLocaleString()}₽ до {nextStepLabel}.</>
              )}
              {deliveryProgress.minOrderReached && !nextStepLabel && (
                <span className="text-green-500 font-medium">
                  У вас уже {deliveryCost === 0 ? 'бесплатная доставка 🎉' : 'лучшие условия по доставке'}.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-tg-hint">Товары:</span>
            <span className="text-tg-text font-medium">
              {subtotal.toLocaleString()}₽
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-tg-hint" />
              <span className="text-tg-hint">Доставка:</span>
            </div>
            <span className={`font-medium ${deliveryCost === 0 ? 'text-green-500' : 'text-tg-text'}`}>
              {deliveryCost === 0 ? 'Бесплатно' : `${deliveryCost.toLocaleString()}₽`}
            </span>
          </div>

          {promoDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <span className="text-tg-hint">Промокод:</span>
              </div>
              <span className="font-medium text-green-500">
                -{promoDiscount.toLocaleString('ru-RU')}₽
              </span>
            </div>
          )}

          {bonusDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-500" />
                <span className="text-tg-hint">Бонусы:</span>
              </div>
              <span className="font-medium text-green-500">
                -{bonusDiscount.toLocaleString()}₽
              </span>
            </div>
          )}

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
            disabled={createOrderMutation.isPending || !canSubmit}
            className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createOrderMutation.isPending
              ? 'Оформление...'
              : canSubmit
                ? 'Подтвердить заказ'
                : 'Минимальный заказ 1000₽'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
