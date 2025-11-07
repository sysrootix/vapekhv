import { useState, useEffect, useRef } from 'react';
import ProductPlaceholder from './ProductPlaceholder';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  priority?: boolean; // Для важных изображений (выше в fold)
}

// In-memory кэш для загруженных изображений
const imageCache = new Map<string, string>();
// Кэш для ошибок загрузки (чтобы не пытаться загружать снова)
const errorCache = new Set<string>();
// Кэш для попыток загрузки (для retry механизма)
const retryCache = new Map<string, number>();

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 секунда
const LOAD_TIMEOUT = 10000; // 10 секунд

// Очистка кэша
export const clearImageCache = () => {
  imageCache.clear();
  errorCache.clear();
  retryCache.clear();
};

export default function OptimizedImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    // Если уже была ошибка загрузки - не пытаемся снова
    if (errorCache.has(src)) {
      setHasError(true);
      return;
    }

    // Проверяем кэш успешно загруженных изображений
    if (imageCache.has(src)) {
      setImageSrc(src);
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // Если priority - загружаем сразу
    if (priority) {
      loadImage(src);
      return;
    }

    // Иначе используем Intersection Observer для lazy loading
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage(src);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Увеличено для более ранней загрузки
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src, priority]);

  const loadImage = (url: string, retryAttempt = 0) => {
    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    let timeoutId: NodeJS.Timeout;

    // Таймаут для загрузки
    timeoutId = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      
      if (retryAttempt < MAX_RETRIES) {
        // Повторная попытка
        retryCountRef.current = retryAttempt + 1;
        setTimeout(() => {
          loadImage(url, retryAttempt + 1);
        }, RETRY_DELAY * (retryAttempt + 1));
      } else {
        // Превышено количество попыток
        errorCache.add(url);
        setHasError(true);
        setIsLoading(false);
      }
    }, LOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeoutId);
      imageCache.set(url, url);
      setImageSrc(url);
      setIsLoaded(true);
      setIsLoading(false);
      retryCountRef.current = 0;
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      
      if (retryAttempt < MAX_RETRIES) {
        // Повторная попытка
        retryCountRef.current = retryAttempt + 1;
        setTimeout(() => {
          loadImage(url, retryAttempt + 1);
        }, RETRY_DELAY * (retryAttempt + 1));
      } else {
        // Превышено количество попыток
        errorCache.add(url);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Начинаем загрузку
    img.src = url;
    
    // Сохраняем timeout для очистки
    timeoutRef.current = timeoutId;
  };

  if (!src || hasError) {
    return (
      <div className={`${placeholderClassName || className} relative`}>
        <ProductPlaceholder />
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`${className} relative`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-tg-bg animate-pulse flex items-center justify-center">
          {isLoading && retryCountRef.current > 0 && (
            <span className="text-xs text-tg-hint">Повторная попытка {retryCountRef.current}/{MAX_RETRIES}</span>
          )}
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setIsLoaded(true);
            setIsLoading(false);
          }}
          onError={() => {
            if (retryCountRef.current < MAX_RETRIES) {
              setTimeout(() => {
                loadImage(src, retryCountRef.current);
              }, RETRY_DELAY);
            } else {
              errorCache.add(src);
              setHasError(true);
              setIsLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
