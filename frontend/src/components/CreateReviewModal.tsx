import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Image as ImageIcon, Video, Upload, XCircle, Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { CreateReviewData } from '../api/review';
import OptimizedImage from './OptimizedImage';

interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReviewData) => Promise<void>;
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  orderId?: string;
  isLoading?: boolean;
}

export default function CreateReviewModal({
  isOpen,
  onClose,
  onSubmit,
  productId,
  productName,
  productImageUrl,
  orderId,
  isLoading = false,
}: CreateReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (type === 'image' && file.type.startsWith('image/')) {
        if (images.length >= 5) {
          setError('Можно загрузить максимум 5 фотографий');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImages((prev) => [...prev, result]);
        };
        reader.readAsDataURL(file);
      } else if (type === 'video' && file.type.startsWith('video/')) {
        if (videos.length >= 2) {
          setError('Можно загрузить максимум 2 видео');
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          setError('Размер видео не должен превышать 50 МБ');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setVideos((prev) => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Пожалуйста, поставьте оценку');
      return;
    }

    setError('');
    try {
      await onSubmit({
        productId,
        orderId,
        rating,
        text: text.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        videos: videos.length > 0 ? videos : undefined,
      });
      resetForm();
    } catch (err) {
      setError('Не удалось отправить отзыв. Попробуйте позже.');
    }
  };

  const resetForm = () => {
    setRating(0);
    setText('');
    setImages([]);
    setVideos([]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 bg-tg-secondary-bg rounded-t-3xl z-[110] safe-bottom max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-tg-secondary-bg border-b border-tg-bg p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-tg-text">Оставить отзыв</h3>
                <p className="text-xs text-tg-hint">Получите 50 баллов</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-tg-bg rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-tg-hint" />
            </button>
          </div>

          {/* Product Info */}
          <div className="flex items-center gap-3 bg-tg-bg rounded-xl p-3">
            {productImageUrl ? (
              <OptimizedImage
                src={productImageUrl}
                alt={productName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-tg-secondary-bg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-tg-hint" />
              </div>
            )}
            <p className="flex-1 text-sm font-medium text-tg-text line-clamp-2">{productName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-3">
              Оценка *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  disabled={isLoading}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-all ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400 scale-110'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-2">
              Текст отзыва (необязательно)
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError('');
              }}
              placeholder={`Поделитесь впечатлениями о товаре "${productName}". Опишите качество, вкус, удобство использования и т.д.`}
              className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl outline-none focus:ring-2 focus:ring-tg-button resize-none"
              rows={4}
              maxLength={1000}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between mt-1">
              {error && <span className="text-xs text-red-500">{error}</span>}
              <span className={`text-xs ml-auto ${text.length > 900 ? 'text-orange-500' : 'text-tg-hint'}`}>
                {text.length}/1000
              </span>
            </div>
            <p className="text-xs text-tg-hint mt-1">
              💡 Пожалуйста, пишите отзыв именно об этом товаре, чтобы помочь другим покупателям
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-2">
              Фотографии ({images.length}/5)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
            />
            {images.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-3 border-2 border-dashed border-tg-hint rounded-xl text-tg-hint hover:border-tg-button hover:text-tg-button transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                <span>Добавить фото</span>
              </button>
            )}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-tg-bg group">
                    <OptimizedImage
                      src={image}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      disabled={isLoading}
                      className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-2">
              Видео ({videos.length}/2)
            </label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => handleFileSelect(e, 'video')}
              className="hidden"
            />
            {videos.length < 2 && (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-3 border-2 border-dashed border-tg-hint rounded-xl text-tg-hint hover:border-tg-button hover:text-tg-button transition-colors flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                <span>Добавить видео</span>
              </button>
            )}
            {videos.length > 0 && (
              <div className="space-y-2 mt-3">
                {videos.map((video, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-tg-bg group">
                    <video src={video} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeVideo(index)}
                      disabled={isLoading}
                      className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || rating === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Отправка...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Отправить отзыв (+50 баллов)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

