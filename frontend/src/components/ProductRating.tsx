import { Star } from 'lucide-react';

interface ProductRatingProps {
  rating: number;
  reviewCount: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProductRating({ rating, reviewCount, onClick, size = 'md' }: ProductRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className={`${sizeClasses[size]} text-gray-300`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`} />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${sizeClasses[size]} text-gray-300`}
          />
        ))}
      </div>
      {reviewCount > 0 && (
        <span className={`${textSizeClasses[size]} text-tg-hint`}>
          {rating.toFixed(1)} ({reviewCount})
        </span>
      )}
      {reviewCount === 0 && (
        <span className={`${textSizeClasses[size]} text-tg-hint`}>
          Нет отзывов
        </span>
      )}
    </div>
  );
}

