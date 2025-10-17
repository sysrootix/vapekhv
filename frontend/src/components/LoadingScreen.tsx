import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-tg-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2 className="w-12 h-12 text-tg-button animate-spin" />
        <p className="text-tg-hint">Загрузка...</p>
      </motion.div>
    </div>
  );
}

