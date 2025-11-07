import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reviewApi, Review } from '../api/review';
import OptimizedImage from './OptimizedImage';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ReviewsModal({ isOpen, onClose, productId, productName }: ReviewsModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewApi.getProductReviews(productId, { limit: 50, offset: 0 }),
    enabled: isOpen,
  });

  const reviews = data?.reviews || [];

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl z-[110] safe-bottom max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-tg-bg">
          <div>
            <h3 className="text-lg font-bold text-tg-text">Отзывы</h3>
            <p className="text-sm text-tg-hint">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tg-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-tg-hint" />
          </button>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button mx-auto mb-4" />
              <p className="text-tg-hint">Загрузка отзывов...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-tg-hint mx-auto mb-4 opacity-30" />
              <p className="text-tg-hint">Пока нет отзывов</p>
            </div>
          ) : (
            reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-tg-bg rounded-xl p-4 space-y-3"
              >
                {/* User Info */}
                <div className="flex items-start gap-3">
                  {review.user.photoUrl ? (
                    <OptimizedImage
                      src={review.user.photoUrl}
                      alt={getUserName(review)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-tg-secondary-bg flex items-center justify-center">
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
                    {review.images.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-tg-secondary-bg">
                        <OptimizedImage
                          src={image}
                          alt={`Фото ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Videos */}
                {review.videos.length > 0 && (
                  <div className="space-y-2">
                    {review.videos.map((video, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-tg-secondary-bg">
                        <video
                          src={video}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
