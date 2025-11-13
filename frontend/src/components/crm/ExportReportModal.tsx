import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';
import { adminApi } from '../../api/admin';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportFormState {
  month: number;
  year: number;
}

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
};

export function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const currentDate = new Date();
  const [formState, setFormState] = useState<ExportFormState>({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // Call API to send the Excel file to Telegram
      const result = await adminApi.exportOrdersReport(formState.month, formState.year);

      // Show success message
      alert(`✅ ${result.message}\n\n📦 Заказов в отчете: ${result.ordersCount}\n\nПроверьте Telegram, файл отправлен в личные сообщения.`);

      // Close modal on success
      onClose();
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.response?.data?.message || 'Ошибка при экспорте отчета. Попробуйте позже.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-tg-secondary-bg rounded-3xl shadow-xl max-w-md w-full p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-tg-text">Скачать отчет</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-tg-bg rounded-xl transition-colors"
                  disabled={isExporting}
                >
                  <X className="w-5 h-5 text-tg-hint" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Month Selector */}
                <div>
                  <label className="block text-sm font-medium text-tg-text mb-2">
                    Месяц
                  </label>
                  <select
                    value={formState.month}
                    onChange={(e) => setFormState({ ...formState, month: parseInt(e.target.value) })}
                    disabled={isExporting}
                    className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all disabled:opacity-50"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Selector */}
                <div>
                  <label className="block text-sm font-medium text-tg-text mb-2">
                    Год
                  </label>
                  <select
                    value={formState.year}
                    onChange={(e) => setFormState({ ...formState, year: parseInt(e.target.value) })}
                    disabled={isExporting}
                    className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all disabled:opacity-50"
                  >
                    {getAvailableYears().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isExporting}
                  className="flex-1 px-4 py-3 bg-tg-bg text-tg-text rounded-xl font-medium hover:bg-tg-bg/70 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 px-4 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Экспорт...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Скачать
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
