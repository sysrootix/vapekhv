import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Send, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ProductRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ProductRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ProductRequestModalProps) {
  const [request, setRequest] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setRequest('');
      setError('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmedRequest = request.trim();
    
    if (!trimmedRequest) {
      setError('Пожалуйста, укажите название товара');
      return;
    }

    if (trimmedRequest.length < 3) {
      setError('Название товара должно быть не менее 3 символов');
      return;
    }

    if (trimmedRequest.length > 500) {
      setError('Название товара слишком длинное (максимум 500 символов)');
      return;
    }

    setError('');
    try {
      await onSubmit(trimmedRequest);
      setRequest('');
      onClose();
    } catch (err) {
      setError('Не удалось отправить запрос. Попробуйте позже.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl p-6 z-[110] safe-bottom max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-tg-text">Не нашли нужный товар?</h3>
                  <p className="text-xs text-tg-hint">Мы добавим его в каталог</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-tg-bg rounded-lg transition-colors"
                disabled={isLoading}
              >
                <X className="w-5 h-5 text-tg-hint" />
              </button>
            </div>

            {/* Иконка с анимацией */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="relative"
              >
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
              </motion.div>
            </div>

            {/* Описание */}
            <p className="text-sm text-tg-hint text-center mb-6">
              Напишите название товара, который вы хотели бы видеть в нашем магазине. 
              Мы обязательно рассмотрим ваш запрос! ✨
            </p>

            {/* Поле ввода */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-tg-text mb-2">
                Название товара
              </label>
              <textarea
                value={request}
                onChange={(e) => {
                  setRequest(e.target.value);
                  setError('');
                }}
                placeholder="Например: Жидкость для вейпа со вкусом клубники..."
                className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button resize-none"
                rows={4}
                maxLength={500}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                {error && (
                  <span className="text-xs text-red-500">{error}</span>
                )}
                <span className={`text-xs ml-auto ${request.length > 450 ? 'text-orange-500' : 'text-tg-hint'}`}>
                  {request.length}/500
                </span>
              </div>
            </div>

            {/* Кнопка отправки */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !request.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Отправить запрос</span>
                </>
              )}
            </button>

            {/* Подсказка */}
            <p className="text-xs text-tg-hint text-center mt-4">
              💡 Чем подробнее описание, тем быстрее мы найдем нужный товар
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

