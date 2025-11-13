import ExcelJS from 'exceljs';
import { logger } from '../config/logger';

export interface OrderExportRow {
  orderNumber: string;
  totalAmount: number;
  deliveryCost: number;
  adminDeliveryCost: number | null;
  bonusEarned: number;
  bonusUsed: number;
  promoDiscount: number;
  promoFreeDelivery: boolean;
}

export interface OrderItemExportRow {
  orderNumber: string;
  productName: string;
  price: number;
  quantity: number;
  totalPrice: number;
  buyPrice: number | null;
  totalBuyPrice: number | null;
}

class ExcelExportService {
  async generateOrdersReport(
    orders: OrderExportRow[],
    orderItems: OrderItemExportRow[],
    month: number,
    year: number
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Рассчитываем итоговые метрики
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalItemsSum = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalCostSum = orderItems.reduce((sum, item) => sum + (item.totalBuyPrice || 0), 0);
      const totalDeliveryPaid = orders.reduce((sum, order) => sum + (order.adminDeliveryCost || 0), 0);
      const totalDeliveryCompensated = orders.reduce((sum, order) => sum + order.deliveryCost, 0);
      
      const margin = totalItemsSum - totalCostSum;
      const markup = totalCostSum > 0 ? ((totalItemsSum - totalCostSum) / totalCostSum) * 100 : 0;
      const marginality = totalItemsSum > 0 ? (margin / totalItemsSum) * 100 : 0;
      
      // ===== ПЕРВЫЙ ЛИСТ: Сводка по заказам =====
      const ordersSheet = workbook.addWorksheet('Заказы');

      // Define columns with headers
      ordersSheet.columns = [
        { header: 'Номер заказа', key: 'orderNumber', width: 20 },
        { header: 'Сумма заказа', key: 'totalAmount', width: 18 },
        { header: 'Человек заплатил за доставку', key: 'deliveryCost', width: 30 },
        { header: 'Мы заплатили за такси', key: 'adminDeliveryCost', width: 25 },
        { header: 'Бонусов начислено', key: 'bonusEarned', width: 20 },
        { header: 'Бонусов списано', key: 'bonusUsed', width: 20 },
        { header: 'Скидка по промокоду', key: 'promoDiscount', width: 22 },
        { header: 'Бесплатная доставка по промокоду', key: 'promoFreeDelivery', width: 35 },
      ];

      // Style header row
      const headerRow = ordersSheet.getRow(1);
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
        ordersSheet.addRow({
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          deliveryCost: order.deliveryCost,
          adminDeliveryCost: order.adminDeliveryCost || 0,
          bonusEarned: order.bonusEarned,
          bonusUsed: order.bonusUsed,
          promoDiscount: order.promoDiscount,
          promoFreeDelivery: order.promoFreeDelivery ? 'Да' : 'Нет',
        });
      });

      // Format currency columns
      ordersSheet.getColumn('totalAmount').numFmt = '#,##0.00₽';
      ordersSheet.getColumn('deliveryCost').numFmt = '#,##0.00₽';
      ordersSheet.getColumn('adminDeliveryCost').numFmt = '#,##0.00₽';
      ordersSheet.getColumn('bonusEarned').numFmt = '#,##0₽';
      ordersSheet.getColumn('bonusUsed').numFmt = '#,##0₽';
      ordersSheet.getColumn('promoDiscount').numFmt = '#,##0.00₽';

      // Align columns
      ordersSheet.getColumn('orderNumber').alignment = { horizontal: 'left' };
      ordersSheet.getColumn('totalAmount').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('deliveryCost').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('adminDeliveryCost').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('bonusEarned').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('bonusUsed').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('promoDiscount').alignment = { horizontal: 'right' };
      ordersSheet.getColumn('promoFreeDelivery').alignment = { horizontal: 'center' };

      // ===== ИТОГОВЫЕ МЕТРИКИ =====
      const summaryStartRow = orders.length + 3;
      
      // Добавляем пустую строку
      ordersSheet.addRow([]);
      
      // Заголовок секции
      const summaryTitleRow = ordersSheet.addRow(['ИТОГОВЫЕ ПОКАЗАТЕЛИ']);
      summaryTitleRow.font = { bold: true, size: 14 };
      summaryTitleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      summaryTitleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      
      // Добавляем метрики
      ordersSheet.addRow(['Выручка:', totalRevenue]).getCell(2).numFmt = '#,##0.00₽';
      ordersSheet.addRow(['Себестоимость:', totalCostSum]).getCell(2).numFmt = '#,##0.00₽';
      ordersSheet.addRow(['Маржа:', margin]).getCell(2).numFmt = '#,##0.00₽';
      ordersSheet.addRow(['Наценка (%):', markup]).getCell(2).numFmt = '0.00"%"';
      ordersSheet.addRow(['Маржинальность (%):', marginality]).getCell(2).numFmt = '0.00"%"';
      ordersSheet.addRow(['Заплатили за доставку:', totalDeliveryPaid]).getCell(2).numFmt = '#,##0.00₽';
      ordersSheet.addRow(['Компенсировано клиентами (доставка):', totalDeliveryCompensated]).getCell(2).numFmt = '#,##0.00₽';
      
      // Стилизация метрик
      for (let i = summaryStartRow + 2; i <= summaryStartRow + 8; i++) {
        const row = ordersSheet.getRow(i);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        row.getCell(2).alignment = { horizontal: 'right' };
        
        // Выделяем маржу зеленым
        if (i === summaryStartRow + 4) {
          row.getCell(2).font = { bold: true, color: { argb: 'FF00B050' } };
        }
      }

      // ===== ВТОРОЙ ЛИСТ: Детализация по товарам =====
      const itemsSheet = workbook.addWorksheet('Товары');

      // Define columns with headers
      itemsSheet.columns = [
        { header: 'Номер заказа', key: 'orderNumber', width: 20 },
        { header: 'Позиция', key: 'productName', width: 40 },
        { header: 'Цена товара', key: 'price', width: 18 },
        { header: 'Кол-во', key: 'quantity', width: 12 },
        { header: 'Сумма', key: 'totalPrice', width: 18 },
        { header: 'Себестоимость', key: 'buyPrice', width: 18 },
        { header: 'Сумма себестоимости', key: 'totalBuyPrice', width: 22 },
      ];

      // Style header row
      const itemsHeaderRow = itemsSheet.getRow(1);
      itemsHeaderRow.font = { bold: true };
      itemsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      itemsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
      itemsHeaderRow.height = 20;

      // Add data rows
      orderItems.forEach((item) => {
        itemsSheet.addRow({
          orderNumber: item.orderNumber,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          buyPrice: item.buyPrice || 0,
          totalBuyPrice: item.totalBuyPrice || 0,
        });
      });

      // Format currency columns
      itemsSheet.getColumn('price').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('totalPrice').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('buyPrice').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('totalBuyPrice').numFmt = '#,##0.00₽';

      // Align columns
      itemsSheet.getColumn('orderNumber').alignment = { horizontal: 'left' };
      itemsSheet.getColumn('productName').alignment = { horizontal: 'left' };
      itemsSheet.getColumn('price').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('quantity').alignment = { horizontal: 'center' };
      itemsSheet.getColumn('totalPrice').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('buyPrice').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('totalBuyPrice').alignment = { horizontal: 'right' };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      logger.info(`Generated Excel report for ${month}/${year} with ${orders.length} orders and ${orderItems.length} items`);
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Error generating Excel report:', error);
      throw new Error('Ошибка при создании отчета');
    }
  }
}

export const excelExportService = new ExcelExportService();
