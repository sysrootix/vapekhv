import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl p-6 z-[110] safe-bottom"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                danger ? 'bg-red-500 bg-opacity-20' : 'bg-yellow-500 bg-opacity-20'
              }`}>
                <AlertCircle className={`w-8 h-8 ${danger ? 'text-red-500' : 'text-yellow-500'}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-tg-text">{title}</h3>

              {/* Message */}
              <p className="text-tg-hint leading-relaxed">{message}</p>

              {/* Buttons */}
              <div className="w-full space-y-3 pt-2">
                <button
                  onClick={onConfirm}
                  className={`w-full py-4 rounded-2xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all ${
                    danger
                      ? 'bg-red-500 text-white'
                      : 'bg-tg-button text-tg-button-text'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  className="w-full bg-tg-bg text-tg-text py-4 rounded-2xl font-semibold text-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
