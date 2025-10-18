import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Upload, Clock, CheckCircle, Copy, XCircle } from 'lucide-react';
import { orderApi, Order } from '../api/order';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { Query } from '@tanstack/react-query';

// Платежные реквизиты
const PAYMENT_CARD_NUMBER = import.meta.env.VITE_PAYMENT_CARD_NUMBER;
const PAYMENT_CARD_HOLDER = import.meta.env.VITE_PAYMENT_CARD_HOLDER;
const SBP_PHONE_NUMBER = import.meta.env.VITE_SBP_PHONE_NUMBER;
const SBP_BANK_NAME = import.meta.env.VITE_SBP_BANK_NAME;
const SBP_RECIPIENT_NAME = import.meta.env.VITE_SBP_RECIPIENT_NAME;

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/orders'), [navigate]);
  useTelegramBackButton(handleBack);

  // Загрузка заказа
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: (query: Query<Order, Error, Order, (string | undefined)[]>) => {
      // Обновляем каждые 10 секунд если статус PENDING_PAYMENT
      return query.state.data?.status === 'PENDING_PAYMENT' ? 10000 : false;
    },
  });

  // Мутация загрузки чека
  const uploadReceiptMutation = useMutation({
    mutationFn: (file: File) => orderApi.uploadReceipt(orderId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Чек отправлен! Ожидайте подтверждения от администратора');
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка загрузки чека';
      toast.error(message);
    },
  });

  // Мутация отмены заказа
  const cancelOrderMutation = useMutation({
    mutationFn: () => orderApi.cancelOrder(orderId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Заказ отменён');
      setShowCancelModal(false);
      navigate('/orders');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка отмены заказа';
      toast.error(message);
    },
  });

  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!order?.paymentExpiresAt) return;

    const calculateTimeRemaining = () => {
      const expiresAt = new Date(order.paymentExpiresAt!).getTime();
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        // Optionally invalidate query to refetch order status
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ minutes, seconds });
    };

    calculateTimeRemaining(); // Initial calculation
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [order?.paymentExpiresAt, orderId, queryClient]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 10MB');
      return;
    }

    setSelectedFile(file);

    // Создаем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Выберите файл чека');
      return;
    }

    uploadReceiptMutation.mutate(selectedFile);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-tg-hint mb-4">Заказ не найден</p>
          <button
            onClick={() => navigate('/orders')}
            className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
          >
            Вернуться к заказам
          </button>
        </div>
      </div>
    );
  }

  // Если заказ уже оплачен или отменен
  if (order.status !== 'PENDING_PAYMENT') {
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
              onClick={() => navigate('/orders')}
              className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-tg-text" />
            </button>
            <h1 className="text-2xl font-bold text-tg-text">
              Заказ #{order.orderNumber}
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="text-center px-6 max-w-md">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-tg-text mb-2">
                {order.status === 'PENDING' && 'Чек отправлен!'}
                {order.status === 'CONFIRMED' && 'Заказ подтверждён!'}
                {order.status === 'CANCELLED' && 'Заказ отменён'}
                {order.status === 'PAYMENT_EXPIRED' && 'Время оплаты истекло'}
              </h2>
              <p className="text-tg-hint mb-6">
                {order.status === 'PENDING' && 'Ожидайте подтверждения от администратора'}
                {order.status === 'CONFIRMED' && 'Ваш заказ принят в работу'}
                {order.status === 'CANCELLED' && 'Заказ был отменён'}
                {order.status === 'PAYMENT_EXPIRED' && 'Вы не успели произвести оплату'}
              </p>
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
              >
                Вернуться к заказам
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      {/* Модальное окно подтверждения отмены */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-tg-secondary-bg rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
                <h2 className="text-xl font-bold text-tg-text">Отменить заказ?</h2>
              </div>
              <p className="text-tg-hint mb-6">
                Вы уверены, что хотите отменить этот заказ? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 px-4 bg-tg-bg text-tg-text rounded-xl font-medium hover:opacity-80 transition-opacity"
                >
                  Нет, вернуться
                </button>
                <button
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {cancelOrderMutation.isPending ? 'Отмена...' : 'Да, отменить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-tg-text">Оплата заказа</h1>
            <p className="text-sm text-tg-hint">#{order.orderNumber}</p>
          </div>
        </motion.div>

        {/* Timer */}
        {timeRemaining && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-500 bg-opacity-10 border border-orange-500 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-500 mb-1">
                  Время на оплату
                </h3>
                <p className="text-sm text-tg-hint">
                  После истечения времени заказ будет отменён
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-500">
                  {String(timeRemaining.minutes).padStart(2, '0')}:
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Payment method selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h2 className="font-semibold text-tg-text text-lg">Выберите способ оплаты:</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all ${
                paymentMethod === 'card'
                  ? 'bg-tg-button text-tg-button-text shadow-lg scale-105'
                  : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
              }`}
            >
              <CreditCard className="w-6 h-6 mx-auto mb-2" />
              По номеру карты
            </button>
            <button
              onClick={() => setPaymentMethod('sbp')}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all ${
                paymentMethod === 'sbp'
                  ? 'bg-tg-button text-tg-button-text shadow-lg scale-105'
                  : 'bg-tg-secondary-bg text-tg-hint hover:bg-opacity-80'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2" />
              По СБП
            </button>
          </div>
        </motion.div>

        {/* Payment info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4"
        >
          <h2 className="font-semibold text-tg-text flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Реквизиты для оплаты
          </h2>

          {paymentMethod === 'card' && (
            <div className="bg-tg-bg rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-tg-hint mb-1">Номер карты</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-mono text-tg-text">{PAYMENT_CARD_NUMBER}</p>
                  <button
                    onClick={() => copyToClipboard(PAYMENT_CARD_NUMBER.replace(/\s/g, ''))}
                    className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-tg-hint" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-tg-hint mb-1">Получатель</p>
                <p className="text-tg-text">{PAYMENT_CARD_HOLDER}</p>
              </div>
            </div>
          )}

          {paymentMethod === 'sbp' && SBP_PHONE_NUMBER && (
            <div className="bg-tg-bg rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-tg-hint mb-1">Номер телефона</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-mono text-tg-text">{SBP_PHONE_NUMBER}</p>
                  <button
                    onClick={() => copyToClipboard(SBP_PHONE_NUMBER)}
                    className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-tg-hint" />
                  </button>
                </div>
              </div>
              {SBP_BANK_NAME && (
                <div>
                  <p className="text-xs text-tg-hint mb-1">Банк получателя</p>
                  <p className="text-tg-text">{SBP_BANK_NAME}</p>
                </div>
              )}
              {SBP_RECIPIENT_NAME && (
                <div>
                  <p className="text-xs text-tg-hint mb-1">Получатель</p>
                  <p className="text-tg-text">{SBP_RECIPIENT_NAME}</p>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-tg-bg pt-3">
            <p className="text-xs text-tg-hint mb-1">Сумма к оплате</p>
            <p className="text-3xl font-bold text-tg-text">
              {order.totalAmount.toLocaleString()}₽
            </p>
          </div>

          <div className="text-xs text-tg-hint bg-tg-bg p-3 rounded-xl">
            <p className="mb-2">Инструкция:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Переведите указанную сумму на карту</li>
              <li>Сделайте скриншот чека об оплате</li>
              <li>Загрузите чек через форму ниже</li>
              <li>Дождитесь подтверждения от администратора</li>
            </ol>
          </div>
        </motion.div>

        {/* Receipt upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4"
        >
          <h2 className="font-semibold text-tg-text flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Загрузка чека
          </h2>

          {/* File input */}
          <div className="space-y-3">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-upload"
              />
              <div className="border-2 border-dashed border-tg-bg rounded-xl p-6 text-center cursor-pointer hover:border-tg-button transition-colors">
                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-tg-hint">{selectedFile?.name}</p>
                    <label
                      htmlFor="receipt-upload"
                      className="inline-block px-4 py-2 bg-tg-bg text-tg-text rounded-lg text-sm cursor-pointer hover:opacity-80"
                    >
                      Выбрать другой файл
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-tg-hint mx-auto" />
                    <p className="text-tg-text font-medium">
                      Нажмите, чтобы выбрать файл
                    </p>
                    <p className="text-xs text-tg-hint">
                      Поддерживаются изображения до 10MB
                    </p>
                  </div>
                )}
              </div>
            </label>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploadReceiptMutation.isPending}
              className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadReceiptMutation.isPending ? 'Отправка...' : 'Отправить чек'}
            </button>
          </div>
        </motion.div>

        {/* Кнопка отмены заказа */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setShowCancelModal(true)}
          className="w-full bg-red-500 bg-opacity-10 text-red-500 border border-red-500 py-4 rounded-2xl font-semibold hover:bg-opacity-20 transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-5 h-5" />
          Отменить заказ
        </motion.button>
      </div>
    </div>
  );
}
