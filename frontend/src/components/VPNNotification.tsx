import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, X, Sparkles } from 'lucide-react';

interface VPNNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function VPNNotification({ isVisible, onClose }: VPNNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(15); // Сбрасываем таймер при скрытии
      return;
    }

    // Автоматическое закрытие через 15 секунд
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onClose]);

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
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' // Выше BottomNav
        }}
      >
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-purple-500/90 via-pink-500/90 to-orange-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20"
          >
            {/* Заголовок с иконкой */}
            <div className="flex items-start gap-3 mb-2">
              <div className="relative flex-shrink-0">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm mb-1">
                  Кажется, вы используете VPN 🌍
                </h3>
                <p className="text-white/90 text-xs leading-relaxed">
                  Для более быстрой загрузки изображений и лучшей работы приложения рекомендуем выключить VPN ✨
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Прогресс-бар таймера */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 15, ease: 'linear' }}
                  className="h-full bg-white/60 rounded-full"
                />
              </div>
              <span className="text-white/70 text-[10px] font-medium min-w-[20px] text-right">
                {timeLeft}с
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

