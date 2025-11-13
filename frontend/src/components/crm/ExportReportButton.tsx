import { useState } from 'react';
import { Download } from 'lucide-react';
import { ExportReportModal } from './ExportReportModal';

interface ExportReportButtonProps {
  className?: string;
}

export function ExportReportButton({ className = '' }: ExportReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-tg-button text-tg-button-text rounded-xl font-medium hover:opacity-90 transition-opacity ${className}`}
      >
        <Download className="w-5 h-5" />
        <span>Скачать отчет</span>
      </button>

      <ExportReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
