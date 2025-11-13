import ExcelJS from 'exceljs';
import { logger } from '../config/logger';

export interface OrderExportRow {
  orderNumber: string;
  totalAmount: number;
  deliveryCost: number;
  adminDeliveryCost: number | null;
}

class ExcelExportService {
  async generateOrdersReport(
    orders: OrderExportRow[],
    month: number,
    year: number
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Заказы');

      // Define columns with headers
      worksheet.columns = [
        { header: 'Номер заказа', key: 'orderNumber', width: 20 },
        { header: 'Сумма заказа', key: 'totalAmount', width: 20 },
        { header: 'Человек заплатил за доставку', key: 'deliveryCost', width: 30 },
        { header: 'Мы заплатили за такси', key: 'adminDeliveryCost', width: 25 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Add data rows
      orders.forEach((order) => {
        worksheet.addRow({
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          deliveryCost: order.deliveryCost,
          adminDeliveryCost: order.adminDeliveryCost || 0,
        });
      });

      // Format currency columns
      worksheet.getColumn('totalAmount').numFmt = '#,##0.00₽';
      worksheet.getColumn('deliveryCost').numFmt = '#,##0.00₽';
      worksheet.getColumn('adminDeliveryCost').numFmt = '#,##0.00₽';

      // Align columns
      worksheet.getColumn('orderNumber').alignment = { horizontal: 'left' };
      worksheet.getColumn('totalAmount').alignment = { horizontal: 'right' };
      worksheet.getColumn('deliveryCost').alignment = { horizontal: 'right' };
      worksheet.getColumn('adminDeliveryCost').alignment = { horizontal: 'right' };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      logger.info(`Generated Excel report for ${month}/${year} with ${orders.length} orders`);
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Error generating Excel report:', error);
      throw new Error('Ошибка при создании отчета');
    }
  }
}

export const excelExportService = new ExcelExportService();
