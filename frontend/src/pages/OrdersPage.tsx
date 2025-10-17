import { motion } from 'framer-motion';
import { Package, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-tg-text">Мои заказы</h1>
          <Package className="w-6 h-6 text-tg-hint" />
        </motion.div>

        {/* Empty state */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center min-h-[60vh]"
        >
          <div className="text-center px-6 max-w-sm">
            <Package className="w-24 h-24 text-tg-hint mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold text-tg-text mb-2">Заказов пока нет</h3>
            <p className="text-tg-hint mb-6">Здесь будет отображаться история ваших заказов</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/catalog')}
              className="w-full bg-tg-button text-tg-button-text py-4 px-6 rounded-2xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Это отличный повод сделать первый заказ!
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

