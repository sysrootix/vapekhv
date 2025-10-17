import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { productApi } from '../api/product';
import { cartApi } from '../api/cart';
import LoadingScreen from '../components/LoadingScreen';
import ProductOptionsModal, { Product } from '../components/ProductOptionsModal';
import OptimizedImage from '../components/OptimizedImage';
import ProductPlaceholder from '../components/ProductPlaceholder';
import { getCategoryPathString } from '../utils/categoryPath';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function CatalogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Устанавливаем категорию из navigation state
  useEffect(() => {
    if (location.state?.categoryId) {
      setSelectedCategory(location.state.categoryId);
    }
  }, [location.state]);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: productApi.getCategories,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', selectedCategory, search],
    queryFn: () =>
      productApi.getProducts({
        categoryId: selectedCategory,
        search: search || undefined,
      }),
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const addToCartMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
      selectedOptions
    }: {
      productId: string;
      quantity: number;
      selectedOptions?: Record<string, string>;
    }) =>
      cartApi.addToCart(productId, quantity, selectedOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Товар добавлен в корзину');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при добавлении в корзину';
      toast.error(message);
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      cartApi.updateCartItem(cartItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при обновлении корзины';
      toast.error(message);
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: (cartItemId: string) => cartApi.removeFromCart(cartItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Товар удален из корзины');
    },
  });

  const handleAddToCart = (product: any) => {
    // Если у товара есть характеристики - открываем модальное окно
    if (product.characteristics && product.characteristics.length > 0) {
      setSelectedProduct(product);
      setIsModalOpen(true);
    } else {
      // Иначе добавляем напрямую
      addToCartMutation.mutate({
        productId: product.id,
        quantity: 1,
      });
    }
  };

  const handleQuantityChange = async (cartItemId: string, currentQuantity: number, delta: number, productId: string) => {
    const newQuantity = currentQuantity + delta;

    if (newQuantity < 1) {
      removeFromCartMutation.mutate(cartItemId);
      return;
    }

    // Если увеличиваем количество - проверяем остаток
    if (delta > 0) {
      try {
        const productDetails = await productApi.getProduct(productId);
        const cartItem = cartData?.items?.find((item: any) => item.id === cartItemId);

        let maxStock = productDetails.stockCount || 0;

        // Если есть выбранные характеристики - проверяем остаток варианта
        if (cartItem?.selectedOptions && productDetails.variants) {
          const variant = productDetails.variants.find((v: any) =>
            Object.entries(cartItem.selectedOptions || {}).every(([key, value]) => v.characteristics[key] === value)
          );
          if (variant) {
            maxStock = variant.stockCount;
          }
        }

        if (newQuantity > maxStock) {
          toast.error(`Доступно только ${maxStock} шт.`);
          return;
        }
      } catch (error) {
        toast.error('Ошибка при проверке остатка');
        return;
      }
    }

    updateCartItemMutation.mutate({ cartItemId, quantity: newQuantity });
  };

  // Получаем cartItem для товара (только для товаров БЕЗ характеристик)
  // Если у товара есть характеристики - не показываем счетчик, только кнопку "Добавить"
  const getCartItemForProduct = (productId: string, hasCharacteristics: boolean) => {
    if (hasCharacteristics) {
      // Для товаров с характеристиками не показываем счетчик в каталоге
      return null;
    }
    return cartData?.items?.find((item: any) => item.productId === productId);
  };

  const handleModalAdd = (productId: string, quantity: number, selectedOptions: Record<string, string>) => {
    addToCartMutation.mutate({
      productId,
      quantity,
      selectedOptions,
    });
  };

  if (loadingCategories) {
    return <LoadingScreen />;
  }

  const products = productsData?.products || [];

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-tg-text">Каталог</h1>
          <ShoppingBag className="w-6 h-6 text-tg-hint" />
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-tg-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full pl-11 pr-4 py-3 bg-tg-secondary-bg text-tg-text rounded-2xl outline-none focus:ring-2 focus:ring-tg-button transition-all"
          />
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-secondary-bg text-tg-text hover:bg-opacity-80'
            }`}
          >
            Все
          </button>
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-secondary-bg text-tg-text hover:bg-opacity-80'
              }`}
            >
              {category.name}
              {category._count && category._count.products > 0 && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({category._count.products})
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button" />
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ShoppingBag className="w-16 h-16 text-tg-hint mx-auto mb-4 opacity-50" />
            <p className="text-tg-hint">Товары не найдены</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex flex-col"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-tg-bg">
                  {product.imageUrl ? (
                    <OptimizedImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      priority={index < 4} // Первые 4 изображения загружаем сразу
                    />
                  ) : (
                    <ProductPlaceholder />
                  )}
                  {product.oldPrice && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                    </div>
                  )}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold">Нет в наличии</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-tg-text font-medium text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>

                  {product.category && (
                    <p className="text-xs text-tg-hint mb-2">{getCategoryPathString(product.category)}</p>
                  )}
                  <div className="mt-auto">
                    {/* Цена */}
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-lg font-bold text-tg-text">
                        {product.price.toLocaleString()}₽
                      </span>
                      {product.oldPrice && (
                        <span className="text-xs text-tg-hint line-through">
                          {product.oldPrice.toLocaleString()}₽
                        </span>
                      )}
                    </div>

                    {/* Кнопки - всегда на одном месте */}
                    {product.inStock ? (
                      (() => {
                        const hasCharacteristics = product.characteristics && product.characteristics.length > 0;
                        const cartItem = getCartItemForProduct(product.id, hasCharacteristics);
                        return cartItem ? (
                          // Товар в корзине - показываем счетчик
                          <div className="flex items-center justify-between bg-tg-bg rounded-xl p-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(cartItem.id, cartItem.quantity, -1, product.id);
                              }}
                              className="p-2.5 hover:bg-tg-hint hover:bg-opacity-10 rounded-lg transition-colors active:scale-95"
                            >
                              <Minus className="w-5 h-5 text-tg-text" />
                            </button>
                            <span className="px-4 text-base font-semibold text-tg-text min-w-[32px] text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(cartItem.id, cartItem.quantity, 1, product.id);
                              }}
                              className="p-2.5 hover:bg-tg-hint hover:bg-opacity-10 rounded-lg transition-colors active:scale-95"
                            >
                              <Plus className="w-5 h-5 text-tg-text" />
                            </button>
                          </div>
                        ) : (
                          // Товар не в корзине - показываем кнопку "Добавить"
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            disabled={addToCartMutation.isPending}
                            className="w-full bg-tg-button text-tg-button-text py-2.5 rounded-xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                          >
                            Добавить
                          </button>
                        );
                      })()
                    ) : (
                      <button
                        disabled
                        className="w-full bg-tg-secondary-bg text-tg-hint py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
                      >
                        Нет в наличии
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Product Options Modal */}
        <ProductOptionsModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onAdd={handleModalAdd}
        />
      </div>
    </div>
  );
}

