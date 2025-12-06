import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../api/product';
import { cartApi } from '../api/cart';
import LoadingScreen from '../components/LoadingScreen';
import ProductOptionsModal, { Product } from '../components/ProductOptionsModal';
import OptimizedImage from '../components/OptimizedImage';
import ProductPlaceholder from '../components/ProductPlaceholder';
import { getCategoryPathString } from '../utils/categoryPath';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: favoriteProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => Promise.resolve({ products: [] }), // Placeholder
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
    if (product.characteristics && product.characteristics.length > 0) {
      setSelectedProduct(product);
      setIsModalOpen(true);
    } else {
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

    if (delta > 0) {
      try {
        const productDetails = await productApi.getProduct(productId);
        const cartItem = cartData?.items?.find((item: any) => item.id === cartItemId);

        let maxStock = productDetails.stockCount || 0;

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

  const getCartItemForProduct = (productId: string, hasCharacteristics: boolean) => {
    if (hasCharacteristics) {
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

  if (loadingProducts) {
    return <LoadingScreen />;
  }

  const products = favoriteProducts?.products || [];

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-tg-text">Избранное</h1>
          <Heart className="w-6 h-6 text-tg-hint" />
        </motion.div>

        {products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Heart className="w-16 h-16 text-tg-hint mx-auto mb-4 opacity-50" />
            <p className="text-tg-hint">В избранном пока пусто</p>
            <p className="text-sm text-tg-hint mt-2">Нажмите на сердечко в карточке товара, чтобы добавить его сюда.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product: any, index: any) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex flex-col"
              >
                <div className="relative aspect-square bg-tg-bg">
                  {product.imageUrl ? (
                    <OptimizedImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      priority={index < 4}
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

                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-tg-text font-medium text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>

                  {product.category && (
                    <p className="text-xs text-tg-hint mb-2">{getCategoryPathString(product.category)}</p>
                  )}
                  <div className="mt-auto">
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

                    {product.inStock ? (
                      (() => {
                        const hasCharacteristics = !!(product.characteristics && product.characteristics.length > 0);
                        const cartItem = getCartItemForProduct(product.id, hasCharacteristics);
                        return cartItem ? (
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
