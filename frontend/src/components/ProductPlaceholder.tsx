interface ProductPlaceholderProps {
  className?: string;
}

export default function ProductPlaceholder({ className = '' }: ProductPlaceholderProps) {
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-tg-secondary-bg to-tg-bg ${className}`}>
      <svg
        className="w-1/2 h-1/2 text-tg-hint opacity-20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    </div>
  );
}
