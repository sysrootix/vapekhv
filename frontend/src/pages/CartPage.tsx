import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Trash2, Plus, Minus, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cartApi } from '../api/cart';
import { productApi } from '../api/product';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import {
  MIN_ORDER_AMOUNT,
  calculateDeliveryCost,
  getDeliveryProgress,
} from '../utils/shipping';

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      cartApi.updateCartItem(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка обновления количества';
      toast.error(message);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: string) => cartApi.removeFromCart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Товар удален из корзины');
    },
    onError: () => {
      toast.error('Ошибка удаления товара');
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Корзина очищена');
    },
  });

  // Функция для получения максимального доступного количества для товара
  const getMaxStock = async (item: any) => {
    try {
      const productDetails = await productApi.getProduct(item.productId);

      // Если есть выбранные опции - ищем вариант
      if (item.selectedOptions && productDetails.variants) {
        const variant = productDetails.variants.find((v: any) =>
          Object.entries(item.selectedOptions).every(([key, value]) => v.characteristics[key] === value)
        );
        return variant ? variant.stockCount : 0;
      }

      return productDetails.stockCount || 0;
    } catch (error) {
      return 0;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const cartItems = data?.items || [];
  const subtotal = data?.total || 0;

  // Расчет доставки
  const deliveryCost = useMemo(() => calculateDeliveryCost(subtotal), [subtotal]);
  const deliveryProgress = useMemo(() => getDeliveryProgress(subtotal), [subtotal]);
  const checkoutDisabled = subtotal < MIN_ORDER_AMOUNT;
  const nextStepLabel = deliveryProgress.nextStep
    ? deliveryProgress.nextStep.cost === 0
      ? 'бесплатной доставки'
      : `доставки за ${deliveryProgress.nextStep.cost}₽`
    : null;

  const total = subtotal + deliveryCost;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-tg-bg pb-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6 max-w-sm"
        >
          <ShoppingCart className="w-24 h-24 text-tg-hint mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold text-tg-text mb-2">Корзина пуста</h2>
          <p className="text-tg-hint mb-6">Добавьте товары из каталога</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/catalog')}
            className="w-full bg-tg-button text-tg-button-text py-4 px-6 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
          >
            Перейти в каталог
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-96">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-tg-text">Корзина</h1>
            <p className="text-tg-hint text-sm">
              {cartItems.length} {cartItems.length === 1 ? 'товар' : 'товара'}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearCartMutation.isPending}
              className="text-red-500 hover:text-red-600 transition-colors text-sm font-medium"
            >
              Очистить
            </button>
          )}
        </motion.div>

        {/* Cart Items */}
        <div className="space-y-3">
          {cartItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-tg-secondary-bg rounded-2xl p-4"
            >
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="w-20 h-20 bg-tg-bg rounded-xl overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-tg-hint opacity-30" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-tg-text font-medium mb-1 line-clamp-2">
                    {item.product.name}
                  </h3>
                  {item.selectedOptions && (
                    <div className="text-xs text-tg-hint mb-2">
                      {Object.entries(item.selectedOptions).map(([key, value]: [string, any]) => (
                        <span key={key} className="mr-2">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.product.category && (
                    <p className="text-xs text-tg-hint mb-2">{item.product.category.name}</p>
                  )}

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantityMutation.mutate({
                              id: item.id,
                              quantity: item.quantity - 1,
                            });
                          }
                        }}
                        disabled={
                          item.quantity <= 1 || updateQuantityMutation.isPending
                        }
                        className="p-1.5 bg-tg-bg rounded-lg text-tg-text hover:bg-opacity-80 transition-colors disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="min-w-[2rem] text-center text-tg-text font-medium">
                        {item.quantity}
                      </span>

                      <button
                        onClick={async () => {
                          const maxStock = await getMaxStock(item);
                          if (item.quantity >= maxStock) {
                            toast.error(`Доступно только ${maxStock} шт.`);
                            return;
                          }
                          updateQuantityMutation.mutate({
                            id: item.id,
                            quantity: item.quantity + 1,
                          });
                        }}
                        disabled={updateQuantityMutation.isPending}
                        className="p-1.5 bg-tg-bg rounded-lg text-tg-text hover:bg-opacity-80 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-tg-text">
                        {(item.product.price * item.quantity).toLocaleString()}₽
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-tg-hint">
                          {item.product.price.toLocaleString()}₽ × {item.quantity}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItemMutation.mutate(item.id)}
                  disabled={removeItemMutation.isPending}
                  className="text-tg-hint hover:text-red-500 transition-colors self-start"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Bar - Total and Checkout */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-16 left-0 right-0 bg-tg-secondary-bg border-t border-tg-bg p-4"
      >
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Подитог */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-tg-hint">Подитог:</span>
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

          {/* Прогресс по доставке */}
          <div className="bg-tg-bg rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-tg-hint font-semibold">
              <span>
                {deliveryProgress.minOrderReached
                  ? deliveryProgress.currentStep?.label ?? 'Минимальный заказ'
                  : 'Минимальный заказ 1000₽'}
              </span>
              <span>
                {deliveryProgress.nextStep?.label ?? 'Лучшие условия'}
              </span>
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
                <span className="text-green-500 font-medium">У вас уже {deliveryCost === 0 ? 'бесплатная доставка 🎉' : 'лучшие условия по доставке'}.</span>
              )}
            </div>
          </div>

          {/* Разделитель */}
          <div className="border-t border-tg-bg pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-tg-text font-semibold">Итого:</span>
              <span className="text-2xl font-bold text-tg-text">
                {total.toLocaleString()}₽
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!checkoutDisabled) {
                navigate('/checkout');
              }
            }}
            disabled={checkoutDisabled}
            className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutDisabled ? 'Минимальный заказ 1000₽' : 'Оформить заказ'}
          </button>
        </div>
      </motion.div>

      {/* Confirm Clear Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Очистить корзину?"
        message="Все товары будут удалены из корзины. Это действие нельзя отменить."
        confirmText="Да, очистить"
        cancelText="Отмена"
        onConfirm={() => {
          clearCartMutation.mutate();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
        danger={true}
      />
    </div>
  );
}

