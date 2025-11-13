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
      
      // Заголовок секции ИТОГОВЫЕ ПОКАЗАТЕЛИ
      const summaryTitleRow = ordersSheet.getRow(summaryStartRow);
      summaryTitleRow.getCell(1).value = 'ИТОГОВЫЕ ПОКАЗАТЕЛИ';
      summaryTitleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      summaryTitleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      
      // Заголовок секции ЗАТРАТЫ (справа)
      summaryTitleRow.getCell(4).value = 'ЗАТРАТЫ';
      summaryTitleRow.getCell(4).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      summaryTitleRow.getCell(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED7D31' },
      };
      
      // Рассчитываем затраты
      const deliveryCost = totalDeliveryPaid - totalDeliveryCompensated;
      const salesPercent = totalRevenue * 0.05; // 5% продавцам
      const danaPercent = totalRevenue * 0.10; // 10% Дане
      const fod = salesPercent + danaPercent;
      const moySkladServer = 3000; // По умолчанию 3000₽
      
      // Добавляем метрики ИТОГОВЫЕ ПОКАЗАТЕЛИ (колонки A-B)
      let currentRow = summaryStartRow + 1;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Выручка:';
      ordersSheet.getRow(currentRow).getCell(2).value = totalRevenue;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Себестоимость:';
      ordersSheet.getRow(currentRow).getCell(2).value = totalCostSum;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Маржа:';
      ordersSheet.getRow(currentRow).getCell(2).value = margin;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '#,##0.00₽';
      ordersSheet.getRow(currentRow).getCell(2).font = { bold: true, color: { argb: 'FF00B050' } };
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Наценка (%):';
      ordersSheet.getRow(currentRow).getCell(2).value = markup / 100;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '0.00%';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Маржинальность (%):';
      ordersSheet.getRow(currentRow).getCell(2).value = marginality / 100;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '0.00%';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Заплатили за доставку:';
      ordersSheet.getRow(currentRow).getCell(2).value = totalDeliveryPaid;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(1).value = 'Компенсировано клиентами (доставка):';
      ordersSheet.getRow(currentRow).getCell(2).value = totalDeliveryCompensated;
      ordersSheet.getRow(currentRow).getCell(2).numFmt = '#,##0.00₽';
      
      // Добавляем метрики ЗАТРАТЫ (колонки D-E)
      currentRow = summaryStartRow + 1;
      ordersSheet.getRow(currentRow).getCell(4).value = 'Потратили на доставку:';
      ordersSheet.getRow(currentRow).getCell(5).value = deliveryCost;
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = 'Мой склад, сервер:';
      ordersSheet.getRow(currentRow).getCell(5).value = moySkladServer;
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = '5% Продавцам от выручки:';
      ordersSheet.getRow(currentRow).getCell(5).value = salesPercent;
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = '10% Дане от выручки:';
      ordersSheet.getRow(currentRow).getCell(5).value = danaPercent;
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = 'ФОД:';
      ordersSheet.getRow(currentRow).getCell(5).value = fod;
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = 'Ревизия:';
      ordersSheet.getRow(currentRow).getCell(5).value = '';
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      ordersSheet.getRow(currentRow).getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' },
      };
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = 'Итого затраты:';
      ordersSheet.getRow(currentRow).getCell(5).value = '';
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      ordersSheet.getRow(currentRow).getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' },
      };
      
      currentRow++;
      ordersSheet.getRow(currentRow).getCell(4).value = 'Чистая прибыль:';
      ordersSheet.getRow(currentRow).getCell(5).value = '';
      ordersSheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00₽';
      ordersSheet.getRow(currentRow).getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' },
      };
      ordersSheet.getRow(currentRow).getCell(5).font = { bold: true, color: { argb: 'FF00B050' } };
      
      // Стилизация всех метрик
      for (let i = summaryStartRow + 1; i <= summaryStartRow + 8; i++) {
        const row = ordersSheet.getRow(i);
        
        // Стилизация ИТОГОВЫЕ ПОКАЗАТЕЛИ
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        row.getCell(2).alignment = { horizontal: 'right' };
        
        // Стилизация ЗАТРАТЫ
        row.getCell(4).font = { bold: true };
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFBE5D6' },
        };
        row.getCell(5).alignment = { horizontal: 'right' };
      }
      
      // Расширяем колонки D и E
      ordersSheet.getColumn(4).width = 30;
      ordersSheet.getColumn(5).width = 20;

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
