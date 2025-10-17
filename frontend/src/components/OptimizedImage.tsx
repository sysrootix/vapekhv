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

// Очистка кэша
export const clearImageCache = () => {
  imageCache.clear();
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
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    // Проверяем кэш
    if (imageCache.has(src)) {
      setImageSrc(src);
      setIsLoaded(true);
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
        rootMargin: '50px', // Начинаем загрузку за 50px до видимости
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, priority]);

  const loadImage = (url: string) => {
    const img = new Image();

    img.onload = () => {
      imageCache.set(url, url);
      setImageSrc(url);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setHasError(true);
    };

    img.src = url;
  };

  if (!src || hasError) {
    return (
      <div className={placeholderClassName || className}>
        <ProductPlaceholder />
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-tg-bg animate-pulse" />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
