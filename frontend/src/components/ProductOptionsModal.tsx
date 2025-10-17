import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';

// Дублируем интерфейсы, чтобы компонент был самодостаточным
export interface ProductVariant {
  id: string;
  sku?: string;
  price?: number;
  stockCount: number;
  inStock: boolean;
  characteristics: Record<string, string>;
}

export interface ProductCharacteristic {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  characteristics?: ProductCharacteristic[];
  variants?: ProductVariant[];
}

interface ProductOptionsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (productId: string, quantity: number, selectedOptions: Record<string, string>) => void;
  showCartPrompt?: boolean; // Показывать ли предложение перейти в корзину
}

export default function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  onAdd,
  showCartPrompt = true,
}: ProductOptionsModalProps) {
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [showGoToCart, setShowGoToCart] = useState(false);

  // Инициализация опций
  useEffect(() => {
    if (isOpen && product?.characteristics) {
      const initial: Record<string, string> = {};
      product.characteristics.forEach(char => {
        if (char.values.length > 0) {
          initial[char.name] = char.values[0];
        }
      });
      setSelectedOptions(initial);
      setQuantity(1); // Сбрасываем количество при открытии
      setShowGoToCart(false); // Сбрасываем состояние при открытии
    }
  }, [isOpen, product]);

  // Поиск выбранного варианта
  const selectedVariant = useMemo(() => {
    if (!product?.variants || Object.keys(selectedOptions).length === 0) {
      return null;
    }
    return product.variants.find(variant =>
      Object.entries(selectedOptions).every(([key, value]) => variant.characteristics[key] === value)
    ) || null;
  }, [selectedOptions, product]);

  // Получить доступные значения для каждой характеристики
  const getAvailableValues = useMemo(() => {
    if (!product?.variants || !product?.characteristics) {
      return {};
    }

    const availableValues: Record<string, Set<string>> = {};

    product.characteristics.forEach(char => {
      availableValues[char.name] = new Set();
    });

    // Проходим по всем вариантам с остатком > 0
    product.variants.forEach(variant => {
      if (variant.stockCount > 0) {
        Object.entries(variant.characteristics).forEach(([key, value]) => {
          if (availableValues[key]) {
            availableValues[key].add(value as string);
          }
        });
      }
    });

    return availableValues;
  }, [product]);

  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!product) return null;

  const hasCharacteristics = product.characteristics && product.characteristics.length > 0;
  const currentPrice = selectedVariant?.price ?? product.price;
  const maxQuantity = selectedVariant?.stockCount ?? 100; // 100 как fallback

  const handleAdd = () => {
    if (hasCharacteristics) {
      const requiredChars = product.characteristics!.filter(c => c.required);
      const allSelected = requiredChars.every(char => selectedOptions[char.name]);
      if (!allSelected) {
        toast.error('Выберите все обязательные опции');
        return;
      }
      if (!selectedVariant) {
        toast.error('Такой вариант товара не найден');
        return;
      }
      if (selectedVariant.stockCount < 1) {
        toast.error('Этого варианта нет в наличии');
        return;
      }
      if (quantity > selectedVariant.stockCount) {
        toast.error(`Максимальное количество для этого варианта: ${selectedVariant.stockCount}`);
        return;
      }
    }

    onAdd(product.id, quantity, selectedOptions);

    // Показываем предложение перейти в корзину
    if (showCartPrompt) {
      setShowGoToCart(true);
    } else {
      onClose();
    }
  };

  const handleGoToCart = () => {
    onClose();
    navigate('/cart');
  };

  const handleContinueShopping = () => {
    setShowGoToCart(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl p-6 z-[110] max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-tg-bg transition-colors"
            >
              <X className="w-5 h-5 text-tg-hint" />
            </button>

            {!showGoToCart ? (
              <>
                <div className="flex gap-4 mb-6 pr-8">
                  {product.imageUrl && (
                    <OptimizedImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-20 h-20 rounded-xl object-cover"
                      priority
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-tg-text">{product.name}</h3>
                    <p className="text-xl font-bold text-tg-button mt-1">
                      {currentPrice.toLocaleString()}₽
                    </p>
                  </div>
                </div>

            {hasCharacteristics && (
              <div className="space-y-4 mb-6">
                {product.characteristics!.map((char) => {
                  const availableForChar = getAvailableValues[char.name] || new Set();
                  return (
                    <div key={char.id}>
                      <label className="block text-sm font-medium text-tg-text mb-2">
                        {char.name}
                        {char.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {char.values.map((value) => {
                          const isAvailable = availableForChar.has(value);
                          // Скрываем недоступные варианты
                          if (!isAvailable) return null;

                          return (
                            <button
                              key={value}
                              onClick={() =>
                                setSelectedOptions((prev) => ({ ...prev, [char.name]: value }))
                              }
                              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                selectedOptions[char.name] === value
                                  ? 'bg-tg-button text-tg-button-text'
                                  : 'bg-tg-bg text-tg-text hover:bg-opacity-80'
                              }`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                 {/* Stock Info */}
                 <div className="text-center pt-2">
                   <span className={`text-sm ${selectedVariant && selectedVariant.stockCount > 0 ? 'text-tg-hint' : 'text-red-500'}`}>
                     В наличии: {selectedVariant ? selectedVariant.stockCount : 0} шт.
                   </span>
                 </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-tg-text mb-2">
                Количество
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 bg-tg-bg rounded-lg hover:bg-opacity-80 transition-colors"
                >
                  <Minus className="w-5 h-5 text-tg-text" />
                </button>
                <span className="text-2xl font-bold text-tg-text min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  className="p-2 bg-tg-bg rounded-lg hover:bg-opacity-80 transition-colors"
                >
                  <Plus className="w-5 h-5 text-tg-text" />
                </button>
              </div>
            </div>

                <button
                  onClick={handleAdd}
                  disabled={hasCharacteristics && (!selectedVariant || selectedVariant.stockCount < 1)}
                  className="w-full bg-tg-button text-tg-button-text py-4 rounded-xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  Добавить • {(currentPrice * quantity).toLocaleString()}₽
                </button>
              </>
            ) : (
              // Экран с предложением перейти в корзину
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-tg-text mb-2">Товар добавлен!</h3>
                <p className="text-tg-hint mb-6">Перейти в корзину для оформления заказа?</p>
                <div className="space-y-3">
                  <button
                    onClick={handleGoToCart}
                    className="w-full bg-tg-button text-tg-button-text py-4 rounded-xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all"
                  >
                    Перейти в корзину
                  </button>
                  <button
                    onClick={handleContinueShopping}
                    className="w-full bg-tg-bg text-tg-text py-4 rounded-xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all"
                  >
                    Продолжить покупки
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}