import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { productApi, ProductVariant } from '../api/product';
import { cartApi } from '../api/cart';
import LoadingScreen from '../components/LoadingScreen';
import ProductPlaceholder from '../components/ProductPlaceholder';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback, useMemo } from 'react';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Telegram BackButton
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  useTelegramBackButton(handleBack);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getProductById(id!),
    enabled: !!id,
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const isInCart = cartData?.items?.some((item: any) => item.productId === id);

  const addToCartMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
      selectedOptions,
    }: {
      productId: string;
      quantity: number;
      selectedOptions?: Record<string, string>;
    }) => cartApi.addToCart(productId, quantity, selectedOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Товар добавлен в корзину');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при добавлении в корзину';
      toast.error(message);
    },
  });

  // Инициализация опций и поиск варианта
  useEffect(() => {
    if (product?.characteristics && product.variants) {
      const initial: Record<string, string> = {};
      product.characteristics.forEach((char: any) => {
        if (char.values.length > 0) {
          initial[char.name] = char.values[0];
        }
      });
      setSelectedOptions(initial);
    }
    setQuantity(1);
  }, [product]);

  // Поиск выбранного варианта при изменении опций
  useEffect(() => {
    if (product?.variants && Object.keys(selectedOptions).length > 0) {
      const foundVariant = product.variants.find(variant => 
        Object.entries(selectedOptions).every(([key, value]) => variant.characteristics[key] === value)
      );
      setSelectedVariant(foundVariant || null);
    }
  }, [selectedOptions, product]);

  // Общий запас (учитывая варианты)
  const totalStock = useMemo(() => {
    if (!product) return 0;
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + v.stockCount, 0);
    }
    return product.stockCount;
  }, [product]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-tg-hint mb-4">Товар не найден</p>
          <button
            onClick={() => navigate('/catalog')}
            className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
          >
            Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  const hasCharacteristics = product.characteristics && product.characteristics.length > 0;
  const isOutOfStock = totalStock === 0;

  const handleAddToCart = () => {
    if (hasCharacteristics) {
      const requiredChars = product.characteristics!.filter((c: any) => c.required);
      const allSelected = requiredChars.every((char: any) => selectedOptions[char.name]);
      
      if (!allSelected) {
        toast.error('Выберите все обязательные характеристики');
        return;
      }
      if (!selectedVariant) {
        toast.error('Такой вариант товара не найден');
        return;
      }
      if (selectedVariant.stockCount < quantity) {
        toast.error('Недостаточно товара в наличии');
        return;
      }
    }

    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      selectedOptions: hasCharacteristics ? selectedOptions : undefined,
    });
  };

  const currentPrice = selectedVariant?.price ?? product.price;

  return (
    <div className="min-h-screen bg-tg-bg pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-tg-secondary-bg rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="p-2 hover:bg-tg-secondary-bg rounded-full transition-colors relative"
          >
            <ShoppingCart className="w-6 h-6 text-tg-text" />
            {cartData?.count && cartData.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-tg-button text-tg-button-text text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartData.count}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative aspect-square bg-tg-secondary-bg"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ProductPlaceholder />
          )}
          {product.oldPrice && (
            <div className="absolute top-4 right-4 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg">
              -{Math.round(((product.oldPrice - currentPrice) / product.oldPrice) * 100)}%
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
              <span className="text-white text-xl font-semibold bg-red-500 px-6 py-3 rounded-2xl">
                Нет в наличии
              </span>
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <div className="p-6 space-y-6">
          {/* Title and Price */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold text-tg-text mb-3">{product.name}</h1>
            
            {product.category && (
              <div className="inline-block px-3 py-1 bg-tg-secondary-bg text-tg-hint text-sm rounded-full mb-4">
                {product.category.name}
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-tg-button">
                {currentPrice.toLocaleString()} ₽
              </span>
              {product.oldPrice && (
                <span className="text-xl text-tg-hint line-through">
                  {product.oldPrice.toLocaleString()} ₽
                </span>
              )}
            </div>

            {isInCart && (
              <div className="inline-flex items-center gap-2 bg-green-500 bg-opacity-20 px-4 py-2 rounded-full">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-500">В корзине</span>
              </div>
            )}
          </motion.div>

          {/* Description */}
          {product.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-tg-secondary-bg rounded-2xl p-5"
            >
              <h2 className="text-lg font-semibold text-tg-text mb-3">Описание</h2>
              <p className="text-tg-hint leading-relaxed whitespace-pre-line">{product.description}</p>
            </motion.div>
          )}

          {/* Characteristics and Quantity */}
          {!isOutOfStock && !isInCart && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-tg-secondary-bg rounded-2xl p-5 space-y-6"
            >
              {/* Characteristics */}
              {hasCharacteristics && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-tg-text">Выберите вариант</h2>
                  
                  {product.characteristics!.map((char: any) => (
                    <div key={char.id}>
                      <label className="block text-sm font-medium text-tg-text mb-3">
                        {char.name}
                        {char.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {char.values.map((value: string) => (
                          <button
                            key={value}
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [char.name]: value,
                              }))
                            }
                            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                              selectedOptions[char.name] === value
                                ? 'bg-tg-button text-tg-button-text shadow-lg scale-105'
                                : 'bg-tg-bg text-tg-text hover:bg-opacity-80'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Stock Info */}
                  {selectedVariant && (
                    <div className="text-center pt-2">
                      <span className="text-tg-hint">
                        В наличии: {selectedVariant.stockCount} шт.
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-tg-bg"></div>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <h2 className="text-lg font-semibold text-tg-text mb-4">Количество</h2>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 bg-tg-bg rounded-xl hover:bg-opacity-80 transition-colors"
                  >
                    <Minus className="w-6 h-6 text-tg-text" />
                  </button>
                  <span className="text-3xl font-bold text-tg-text min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-3 bg-tg-bg rounded-xl hover:bg-opacity-80 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-tg-text" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Add to Cart */}
      {!isOutOfStock && !isInCart && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-tg-bg p-4 z-20"
        >
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending || (hasCharacteristics && !selectedVariant)}
              className="w-full bg-tg-button text-tg-button-text py-4 rounded-2xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-6 h-6" />
              Добавить в корзину • {(currentPrice * quantity).toLocaleString()} ₽
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}