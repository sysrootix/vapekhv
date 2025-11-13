import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface ImprovedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function ImprovedPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading,
}: ImprovedPaginationProps) {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageInput = (value: string) => {
    setPageInput(value);
    const page = Number(value);
    if (page >= 1 && page <= totalPages && !isNaN(page)) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-tg-button/10">
      <div className="text-sm text-tg-hint">
        Показано <span className="font-semibold text-tg-text">{startItem}-{endItem}</span> из{' '}
        <span className="font-semibold text-tg-text">{totalItems}</span>
        {isLoading && <span className="ml-2 text-xs">Загрузка...</span>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-opacity-80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-tg-hint hidden sm:inline">Страница</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => handlePageInput(pageInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePageInput(pageInput);
              }
            }}
            className="w-16 px-3 py-2 rounded-xl bg-tg-secondary-bg text-tg-text text-sm text-center border-2 border-transparent focus:border-tg-button focus:outline-none"
          />
          <span className="text-sm text-tg-hint">из {totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-opacity-80 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


