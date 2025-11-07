import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { productApi, Product } from '../api/product';
import OptimizedImage from './OptimizedImage';
import ProductPlaceholder from './ProductPlaceholder';
import { getCategoryPathString } from '../utils/categoryPath';

export default function RecentProducts() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recentProducts'],
    queryFn: () => productApi.getRecentProducts(10),
    retry: false,
    staleTime: 30000, // Кешируем на 30 секунд
  });

  // Показываем только если есть данные
  if (isLoading) {
    return null; // Не показываем загрузку
  }

  if (error) {
    // При ошибке не показываем блок
    return null;
  }

  if (!data || data.products.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-4 px-4">
        <Clock className="w-5 h-5 text-tg-button" />
        <h2 className="text-xl font-bold text-tg-text">Недавно просматривали</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
        {data.products.map((product: Product, index: number) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/product/${product.id}`)}
            className="flex-shrink-0 w-[160px] bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex flex-col snap-start"
          >
            {/* Product Image */}
            <div className="relative aspect-square bg-tg-bg">
              {product.imageUrl ? (
                <OptimizedImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
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
                  <span className="text-white text-xs font-semibold">Нет в наличии</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3 flex flex-col flex-grow">
              <h3 className="text-tg-text font-medium text-sm line-clamp-2 mb-1">
                {product.name}
              </h3>

              {product.category && (
                <p className="text-xs text-tg-hint mb-2 line-clamp-1">
                  {getCategoryPathString(product.category)}
                </p>
              )}

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-tg-text">
                    {product.price.toLocaleString()}₽
                  </span>
                  {product.oldPrice && (
                    <span className="text-xs text-tg-hint line-through">
                      {product.oldPrice.toLocaleString()}₽
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

