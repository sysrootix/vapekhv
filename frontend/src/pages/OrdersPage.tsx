import { motion } from 'framer-motion';
import { Package, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { useCallback } from 'react';

export default function OrdersPage() {
  const navigate = useNavigate();

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/'), [navigate]);
  useTelegramBackButton(handleBack);

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tg-secondary-bg rounded-xl">
              <Package className="w-6 h-6 text-tg-button" />
            </div>
            <h1 className="text-2xl font-bold text-tg-text">Мои заказы</h1>
          </div>
        </motion.div>

        {/* Empty state */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center min-h-[70vh]"
        >
          <div className="text-center px-6 max-w-md">
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative mx-auto mb-6 w-32 h-32"
            >
              <div className="absolute inset-0 bg-tg-button bg-opacity-10 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-tg-secondary-bg rounded-full flex items-center justify-center">
                <Package className="w-16 h-16 text-tg-button" />
              </div>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-tg-text mb-3"
            >
              История заказов пуста
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-tg-hint mb-8 leading-relaxed"
            >
              Здесь появятся ваши заказы с актуальной информацией о статусе доставки и истории покупок
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-3 mb-8"
            >
              <div className="bg-tg-secondary-bg rounded-2xl p-4">
                <Clock className="w-6 h-6 text-tg-button mx-auto mb-2" />
                <p className="text-xs text-tg-hint">Отслеживание статуса</p>
              </div>
              <div className="bg-tg-secondary-bg rounded-2xl p-4">
                <TrendingUp className="w-6 h-6 text-tg-button mx-auto mb-2" />
                <p className="text-xs text-tg-hint">История покупок</p>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/catalog')}
              className="w-full bg-tg-button text-tg-button-text py-4 px-6 rounded-2xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Перейти в каталог
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

