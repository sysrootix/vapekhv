import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Gift } from 'lucide-react';
import { PendingReviewProduct } from '../api/review';
import OptimizedImage from './OptimizedImage';

interface ReviewNotificationProps {
  isVisible: boolean;
  product: PendingReviewProduct;
  onClose: () => void;
  onReview: () => void;
}

export default function ReviewNotification({
  isVisible,
  product,
  onClose,
  onReview,
}: ReviewNotificationProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-24 left-0 right-0 z-50 px-4"
        style={{
          paddingBottom: `max(env(safe-area-inset-bottom, 0px), 8px)`,
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-purple-500/90 via-pink-500/90 to-orange-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Gift className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm mb-1">
                  Оставьте отзыв и получите 50 баллов! 🎁
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  {product.productImageUrl ? (
                    <OptimizedImage
                      src={product.productImageUrl}
                      alt={product.productName}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <p className="text-white/90 text-xs flex-1 line-clamp-2">
                    {product.productName}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <button
              onClick={onReview}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              <span>Оставить отзыв</span>
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

