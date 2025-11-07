import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ArrowRight, Package } from 'lucide-react';
import { reviewApi, Review } from '../api/review';
import LoadingScreen from '../components/LoadingScreen';
import OptimizedImage from '../components/OptimizedImage';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { useCallback, useState } from 'react';

export default function AllReviewsPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  useTelegramBackButton(handleBack);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['allReviews', offset],
    queryFn: () => reviewApi.getAllReviews({ limit, offset }),
  });

  const reviews = data?.reviews || [];
  const total = data?.total || 0;
  const hasMore = offset + limit < total;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getUserName = (review: Review) => {
    if (review.user.firstName || review.user.lastName) {
      return `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim();
    }
    return review.user.username || 'Пользователь';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading && offset === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-tg-secondary-bg rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-tg-text">Все отзывы</h1>
            {total > 0 && (
              <p className="text-sm text-tg-hint">{total} отзывов</p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Star className="w-16 h-16 text-tg-hint mx-auto mb-4 opacity-30" />
            <p className="text-tg-hint">Пока нет отзывов</p>
          </motion.div>
        ) : (
          <>
            {reviews.map((review: Review, index: number) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-tg-secondary-bg rounded-2xl p-4 space-y-3"
              >
                {/* User Info */}
                <div className="flex items-start gap-3">
                  {review.user.photoUrl ? (
                    <OptimizedImage
                      src={review.user.photoUrl}
                      alt={getUserName(review)}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-tg-bg flex items-center justify-center flex-shrink-0">
                      <span className="text-tg-text font-semibold text-sm">
                        {getUserName(review).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-tg-text">{getUserName(review)}</p>
                      <span className="text-xs text-tg-hint">{formatDate(review.createdAt)}</span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* Review Text */}
                {review.text && (
                  <p className="text-tg-text text-sm leading-relaxed">{review.text}</p>
                )}

                {/* Images */}
                {review.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {review.images.map((image, imgIndex) => (
                      <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden bg-tg-bg">
                        <OptimizedImage
                          src={image}
                          alt={`Фото ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Videos */}
                {review.videos.length > 0 && (
                  <div className="space-y-2">
                    {review.videos.map((video, vidIndex) => (
                      <div key={vidIndex} className="relative aspect-video rounded-lg overflow-hidden bg-tg-bg">
                        <video
                          src={video}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Product Link */}
                <div
                  onClick={() => navigate(`/product/${review.productId}`)}
                  className="flex items-center gap-2 bg-tg-bg rounded-xl p-2 cursor-pointer hover:opacity-80 transition-opacity"
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

            {/* Load More Button */}
            {hasMore && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setOffset((prev) => prev + limit);
                  refetch();
                }}
                disabled={isLoading}
                className="w-full bg-tg-button text-tg-button-text py-3 rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Загрузка...' : 'Загрузить еще'}
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

