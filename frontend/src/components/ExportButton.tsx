import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[];
  title?: string;
}

export default function ExportButton({ data, filename, columns, title }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      // Подготовка данных
      const headers = columns.map(col => col.label).join(',');
      const rows = data.map(item =>
        columns
          .map(col => {
            const value = item[col.key];
            const formatted = col.format ? col.format(value) : value;
            // Экранируем запятые и кавычки
            const escaped = String(formatted).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      );

      const csv = [headers, ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
    } catch (error) {
      console.error('Ошибка экспорта CSV:', error);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // Подготовка данных
      const headers = columns.map(col => col.label);
      const rows = data.map(item =>
        columns.map(col => {
          const value = item[col.key];
          return col.format ? col.format(value) : value;
        })
      );

      const wsData = [headers, ...rows];
      const ws = utils.aoa_to_sheet(wsData);

      // Автоподбор ширины колонок
      const maxWidth = 50;
      const colWidths = columns.map((col, i) => {
        const headerLen = col.label.length;
        const maxDataLen = Math.max(
          ...rows.map(row => String(row[i] || '').length)
        );
        return Math.min(Math.max(headerLen, maxDataLen) + 2, maxWidth);
      });

      ws['!cols'] = colWidths.map(w => ({ wch: w }));

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, title || 'Данные');
      writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error('Ошибка экспорта Excel:', error);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();

      // Заголовок
      if (title) {
        doc.setFontSize(16);
        doc.text(title, 14, 15);
      }

      // Таблица
      autoTable(doc, {
        head: [columns.map(col => col.label)],
        body: data.map(item =>
          columns.map(col => {
            const value = item[col.key];
            return col.format ? col.format(value) : String(value);
          })
        ),
        startY: title ? 25 : 15,
        styles: {
          font: 'helvetica',
          fontSize: 9,
        },
        headStyles: {
          fillColor: [59, 130, 246], // blue-500
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
      });

      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Ошибка экспорта PDF:', error);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        exportToCSV();
        break;
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tg-button text-tg-button-text font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Экспорт...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Экспорт
            <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-tg-secondary-bg rounded-xl shadow-lg border border-tg-button/20 overflow-hidden z-50"
          >
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-tg-text hover:bg-tg-bg transition-colors"
            >
              <FileText className="w-4 h-4 text-green-500" />
              <div>
                <div className="font-medium">CSV</div>
                <div className="text-xs text-tg-hint">Таблица в формате CSV</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('excel')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-tg-text hover:bg-tg-bg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="font-medium">Excel</div>
                <div className="text-xs text-tg-hint">Файл .xlsx</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-tg-text hover:bg-tg-bg transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <div>
                <div className="font-medium">PDF</div>
                <div className="text-xs text-tg-hint">Документ PDF</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop для закрытия меню при клике вне */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
