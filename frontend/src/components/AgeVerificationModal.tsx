import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield } from 'lucide-react';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

const STORAGE_KEY = 'age-verification-confirmed';

export const checkAgeVerification = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setAgeVerificationConfirmed = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
};

export default function AgeVerificationModal({ isOpen, onConfirm }: AgeVerificationModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  const handleConfirm = () => {
    setAgeVerificationConfirmed();
    setIsVisible(false);
    onConfirm();
  };

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={(e) => {
              // Не закрываем при клике на overlay - обязательное подтверждение
              e.stopPropagation();
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto"
            style={{
              paddingTop: `max(env(safe-area-inset-top, 0px), 16px)`,
              paddingBottom: `max(env(safe-area-inset-bottom, 0px), 16px)`,
              paddingLeft: `max(env(safe-area-inset-left, 0px), 16px)`,
              paddingRight: `max(env(safe-area-inset-right, 0px), 16px)`,
            }}
          >
            <div className="w-full max-w-md mx-auto my-auto">
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-tg-secondary-bg rounded-3xl shadow-2xl overflow-hidden"
                style={{
                  maxHeight: 'calc(100vh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                  maxWidth: 'calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))',
                }}
              >
                {/* Header with icon */}
                <div className="relative bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 p-4 sm:p-6 pb-6 sm:pb-8">
                  <div className="flex items-center justify-center mb-3 sm:mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border-2 border-orange-500/30">
                        <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" strokeWidth={2.5} />
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 sm:p-1.5 border-2 border-tg-secondary-bg"
                      >
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-bold text-tg-text text-center mb-1 sm:mb-2">
                    18+
                  </h2>
                  <p className="text-xs sm:text-sm text-tg-hint text-center">
                    Подтверждение возраста
                  </p>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2 sm:space-y-3">
                    <p className="text-sm sm:text-base text-tg-text leading-relaxed text-center px-1">
                      Продолжая пользоваться приложением, вы подтверждаете, что вам{' '}
                      <span className="font-bold text-orange-500">исполнилось 18 лет</span>.
                    </p>

                    <div className="bg-tg-bg rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                      <p className="text-xs sm:text-sm text-tg-hint leading-relaxed">
                        <span className="font-semibold text-tg-text">Важно:</span> Продукция, представленная в нашем магазине, предназначена только для лиц, достигших совершеннолетия.
                      </p>
                      <p className="text-[10px] sm:text-xs text-tg-hint leading-relaxed">
                        Использование вейп-продукции несовершеннолетними запрещено законодательством Российской Федерации.
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-2 sm:pt-4 space-y-2 sm:space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base bg-tg-button text-tg-button-text shadow-lg hover:opacity-90 active:scale-95 transition-all"
                    >
                      Мне есть 18 лет
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // При отказе закрываем приложение или показываем сообщение
                        if (window.Telegram?.WebApp) {
                          window.Telegram.WebApp.close();
                        } else {
                          // Fallback для браузера
                          alert('Для использования приложения необходимо подтвердить возраст 18+');
                        }
                      }}
                      className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm bg-tg-bg text-tg-hint hover:bg-opacity-80 active:scale-95 transition-all border border-tg-hint/20"
                    >
                      Мне нет 18 лет
                    </motion.button>
                  </div>

                  {/* Legal notice */}
                  <p className="text-[9px] sm:text-[10px] text-tg-hint text-center leading-relaxed pt-1 sm:pt-2 px-2">
                    Нажимая кнопку «Мне есть 18 лет», вы принимаете условия использования приложения и подтверждаете свой возраст.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

