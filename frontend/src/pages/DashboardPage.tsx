import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, TrendingUp, Star, ArrowRight, Droplets, Wind, Package, Sparkles, Flame, Zap, BoxSelect, Gift, MessageSquare } from 'lucide-react';
import { productApi } from '../api/product';
import { userApi } from '../api/user';
import { reviewApi } from '../api/review';
import LoadingScreen from '../components/LoadingScreen';
import ProductPlaceholder from '../components/ProductPlaceholder';
import ProductRating from '../components/ProductRating';
import OptimizedImage from '../components/OptimizedImage';

// Функция для получения иконки категории
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();

  if (name.includes('жидкост') || name.includes('жиж') || name.includes('liquid')) {
    return <Droplets className="w-6 h-6" />;
  }
  if (name.includes('однораз') || name.includes('disposable') || name.includes('вейп')) {
    return <Wind className="w-6 h-6" />;
  }
  if (name.includes('картридж') || name.includes('под') || name.includes('pod') || name.includes('система')) {
    return <BoxSelect className="w-6 h-6" />;
  }
  if (name.includes('аксессуар') || name.includes('accessori')) {
    return <Package className="w-6 h-6" />;
  }
  if (name.includes('новинк') || name.includes('new')) {
    return <Sparkles className="w-6 h-6" />;
  }
  if (name.includes('хит') || name.includes('популярн') || name.includes('hit')) {
    return <Flame className="w-6 h-6" />;
  }
  if (name.includes('акци') || name.includes('скидк') || name.includes('sale')) {
    return <Gift className="w-6 h-6" />;
  }
  if (name.includes('устройств') || name.includes('device')) {
    return <Zap className="w-6 h-6" />;
  }

  // По умолчанию
  return <ShoppingBag className="w-6 h-6" />;
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: userData } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: productApi.getCategories,
  });

  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productApi.getProducts({ limit: 6 }),
  });

  const { data: randomReviewsData } = useQuery({
    queryKey: ['randomReviews'],
    queryFn: () => reviewApi.getRandomReviews(3),
  });

  if (loadingCategories || loadingFeatured) {
    return <LoadingScreen />;
  }

  const categories = categoriesData || [];
  const featuredProducts = featuredData?.products || [];
  const randomReviews = randomReviewsData?.reviews || [];
  const user = userData?.user;

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-tg-text">
            Привет, {user?.firstName || 'друг'}! 👋
          </h1>
          <p className="text-tg-hint">Добро пожаловать в VapeKHV</p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate('/catalog')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            <ShoppingBag className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-sm opacity-90">Категорий</p>
          </button>
          <button
            onClick={() => navigate('/catalog')}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{featuredProducts.length}+</p>
            <p className="text-sm opacity-90">Новинок</p>
          </button>
        </motion.div>

        {/* Reviews Section - Перемещено выше для доверия */}
        {randomReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold text-tg-text">Отзывы покупателей</h2>
              </div>
              <button
                onClick={() => navigate('/reviews')}
                className="text-tg-button text-sm font-medium flex items-center gap-1"
              >
                Все отзывы
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {randomReviews.map((review: any, index: number) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  onClick={() => navigate(`/product/${review.productId}`)}
                  className="bg-tg-secondary-bg rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {review.user.photoUrl ? (
                      <OptimizedImage
                        src={review.user.photoUrl}
                        alt={review.user.firstName || review.user.username || 'Пользователь'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-tg-bg flex items-center justify-center flex-shrink-0">
                        <span className="text-tg-text font-semibold text-sm">
                          {(review.user.firstName || review.user.username || 'П').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-tg-text text-sm">
                          {review.user.firstName || review.user.username || 'Пользователь'}
                        </p>
                        <ProductRating
                          rating={review.rating}
                          reviewCount={1}
                          size="sm"
                        />
                      </div>
                      {review.text && (
                        <p className="text-tg-hint text-sm line-clamp-2">{review.text}</p>
                      )}
                    </div>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/product/${review.productId}`);
                    }}
                    className="flex items-center gap-2 bg-tg-bg rounded-xl p-2 mt-2"
                  >
                    {review.product.imageUrl ? (
                      <OptimizedImage
                        src={review.product.imageUrl}
                        alt={review.product.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-tg-secondary-bg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-tg-hint" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tg-text line-clamp-1">{review.product.name}</p>
                      {review.product.price && (
                        <p className="text-xs text-tg-hint">{review.product.price.toLocaleString()}₽</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-tg-hint flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-tg-text">Категории</h2>
            <button
              onClick={() => navigate('/catalog')}
              className="text-tg-button text-sm font-medium flex items-center gap-1"
            >
              Все
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.slice(0, 4).map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                onClick={() => navigate('/catalog', { state: { categoryId: category.id } })}
                className="bg-tg-secondary-bg rounded-2xl p-4 text-left hover:bg-opacity-80 transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-3 text-white">
                  {getCategoryIcon(category.name)}
                </div>
                <h3 className="font-semibold text-tg-text mb-1">{category.name}</h3>
                <p className="text-xs text-tg-hint">
                  {category._count?.products || 0} товаров
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-xl font-bold text-tg-text">Рекомендуем</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="aspect-square bg-tg-bg relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ProductPlaceholder />
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Хит
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-tg-text line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-tg-button">
                      {product.price.toLocaleString()}₽
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => navigate('/catalog')}
              className="w-full bg-tg-button text-tg-button-text py-3 rounded-2xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Смотреть весь каталог
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

