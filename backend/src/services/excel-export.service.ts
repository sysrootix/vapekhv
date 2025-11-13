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

interface ProductStats {
  productName: string;
  totalRevenue: number;
  totalQuantity: number;
  totalMargin: number;
  marginPercent: number;
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

      // Создаем мапу для расчета маржи по заказам
      const orderMarginMap = new Map<string, number>();
      orderItems.forEach(item => {
        const currentMargin = orderMarginMap.get(item.orderNumber) || 0;
        const itemMargin = item.totalPrice - (item.totalBuyPrice || 0);
        orderMarginMap.set(item.orderNumber, currentMargin + itemMargin);
      });
      
      // Add data rows with conditional formatting
      orders.forEach((order) => {
        const row = ordersSheet.addRow({
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          deliveryCost: order.deliveryCost,
          adminDeliveryCost: order.adminDeliveryCost || 0,
          bonusEarned: order.bonusEarned,
          bonusUsed: order.bonusUsed,
          promoDiscount: order.promoDiscount,
          promoFreeDelivery: order.promoFreeDelivery ? 'Да' : 'Нет',
        });
        
        // Рассчитываем маржинальность заказа
        const orderMargin = orderMarginMap.get(order.orderNumber) || 0;
        const orderRevenue = orderItems
          .filter(item => item.orderNumber === order.orderNumber)
          .reduce((sum, item) => sum + item.totalPrice, 0);
        const orderMarginPercent = orderRevenue > 0 ? (orderMargin / orderRevenue) * 100 : 0;
        
        // Условное форматирование по марже
        if (orderMarginPercent >= 40) {
          // Высокая маржа - зеленый
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFC6EFCE' },
            };
          });
        } else if (orderMarginPercent <= 15) {
          // Низкая маржа - красный
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' },
            };
          });
        } else if (order.promoDiscount > 0 || order.promoFreeDelivery) {
          // Промокоды - оранжевый (если маржа средняя)
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF4E6' },
            };
          });
        }
        
        // Подсветка высоких бонусов
        if (order.bonusUsed > 100) {
          row.getCell('bonusUsed').font = { bold: true, color: { argb: 'FFFF6B6B' } };
        }
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

      // ===== БЛОК АНАЛИТИКА =====
      const analyticsStartRow = summaryStartRow + 10;
      
      // Рассчитываем аналитические показатели
      const ordersCount = orders.length;
      const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const averageCheck = ordersCount > 0 ? totalRevenue / ordersCount : 0;
      const averageBasketDepth = ordersCount > 0 ? totalItemsCount / ordersCount : 0;
      const averageItemPrice = totalItemsCount > 0 ? totalItemsSum / totalItemsCount : 0;
      const averageDelivery = ordersCount > 0 ? totalDeliveryPaid / ordersCount : 0;
      const deliveryCompensationRate = totalDeliveryPaid > 0 ? (totalDeliveryCompensated / totalDeliveryPaid) * 100 : 0;
      const averageMarginPerOrder = ordersCount > 0 ? margin / ordersCount : 0;
      const ordersWithBonuses = orders.filter(o => o.bonusUsed > 0).length;
      const bonusUsageRate = ordersCount > 0 ? (ordersWithBonuses / ordersCount) * 100 : 0;
      const ordersWithPromo = orders.filter(o => o.promoDiscount > 0 || o.promoFreeDelivery).length;
      const promoUsageRate = ordersCount > 0 ? (ordersWithPromo / ordersCount) * 100 : 0;
      const totalBonusEarned = orders.reduce((sum, o) => sum + o.bonusEarned, 0);
      const totalBonusUsed = orders.reduce((sum, o) => sum + o.bonusUsed, 0);
      const totalPromoDiscount = orders.reduce((sum, o) => sum + o.promoDiscount, 0);
      const freeDeliveryCount = orders.filter(o => o.promoFreeDelivery).length;
      
      // Дополнительные метрики
      const roi = totalCostSum > 0 ? ((margin / totalCostSum) * 100) : 0;
      const averagePromoDiscount = ordersWithPromo > 0 ? totalPromoDiscount / ordersWithPromo : 0;
      
      // Эффективность промокодов
      const revenueWithPromo = orders
        .filter(o => o.promoDiscount > 0 || o.promoFreeDelivery)
        .reduce((sum, o) => sum + o.totalAmount, 0);
      const revenueWithoutPromo = totalRevenue - revenueWithPromo;
      
      // Заголовок секции АНАЛИТИКА
      ordersSheet.addRow([]);
      const analyticsTitleRow = ordersSheet.getRow(analyticsStartRow);
      analyticsTitleRow.getCell(1).value = 'АНАЛИТИКА';
      analyticsTitleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      analyticsTitleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' },
      };
      
      // Добавляем аналитические метрики
      let analyticsRow = analyticsStartRow + 1;
      
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Количество заказов:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = ordersCount;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Средний чек:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averageCheck;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0.00₽';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Глубина чека (товаров в заказе):';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averageBasketDepth;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '0.00';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Средняя цена товара:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averageItemPrice;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0.00₽';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Всего товаров продано:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = totalItemsCount;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Средняя стоимость доставки:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averageDelivery;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0.00₽';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Компенсация доставки клиентами (%):';
      ordersSheet.getRow(analyticsRow).getCell(2).value = deliveryCompensationRate / 100;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '0.00%';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Средняя маржа на заказ:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averageMarginPerOrder;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0.00₽';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Использование бонусов (%):';
      ordersSheet.getRow(analyticsRow).getCell(2).value = bonusUsageRate / 100;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '0.00%';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Использование промокодов (%):';
      ordersSheet.getRow(analyticsRow).getCell(2).value = promoUsageRate / 100;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '0.00%';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'ROI (Return on Investment):';
      ordersSheet.getRow(analyticsRow).getCell(2).value = roi / 100;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '0.00%';
      
      analyticsRow++;
      ordersSheet.getRow(analyticsRow).getCell(1).value = 'Средняя скидка по промокоду:';
      ordersSheet.getRow(analyticsRow).getCell(2).value = averagePromoDiscount;
      ordersSheet.getRow(analyticsRow).getCell(2).numFmt = '#,##0.00₽';
      
      // Стилизация аналитики
      for (let i = analyticsStartRow + 1; i <= analyticsStartRow + 13; i++) {
        const row = ordersSheet.getRow(i);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2EFDA' },
        };
        row.getCell(2).alignment = { horizontal: 'right' };
      }
      
      // ===== БЛОК БОНУСЫ И ПРОМОКОДЫ =====
      const bonusStartRow = analyticsStartRow;
      
      // Заголовок секции (справа от аналитики)
      ordersSheet.getRow(bonusStartRow).getCell(4).value = 'БОНУСЫ И ПРОМОКОДЫ';
      ordersSheet.getRow(bonusStartRow).getCell(4).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      ordersSheet.getRow(bonusStartRow).getCell(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9966FF' },
      };
      
      let bonusRow = bonusStartRow + 1;
      
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Всего начислено бонусов:';
      ordersSheet.getRow(bonusRow).getCell(5).value = totalBonusEarned;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0₽';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Всего списано бонусов:';
      ordersSheet.getRow(bonusRow).getCell(5).value = totalBonusUsed;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0₽';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Заказов с бонусами:';
      ordersSheet.getRow(bonusRow).getCell(5).value = ordersWithBonuses;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Всего скидок по промокодам:';
      ordersSheet.getRow(bonusRow).getCell(5).value = totalPromoDiscount;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0.00₽';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Заказов с промокодами:';
      ordersSheet.getRow(bonusRow).getCell(5).value = ordersWithPromo;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Бесплатных доставок по промокоду:';
      ordersSheet.getRow(bonusRow).getCell(5).value = freeDeliveryCount;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Выручка с промокодами:';
      ordersSheet.getRow(bonusRow).getCell(5).value = revenueWithPromo;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0.00₽';
      
      bonusRow++;
      ordersSheet.getRow(bonusRow).getCell(4).value = 'Выручка без промокодов:';
      ordersSheet.getRow(bonusRow).getCell(5).value = revenueWithoutPromo;
      ordersSheet.getRow(bonusRow).getCell(5).numFmt = '#,##0.00₽';
      
      // Стилизация бонусов
      for (let i = bonusStartRow + 1; i <= bonusStartRow + 8; i++) {
        const row = ordersSheet.getRow(i);
        row.getCell(4).font = { bold: true };
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3E5F5' },
        };
        row.getCell(5).alignment = { horizontal: 'right' };
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
        { header: 'Маржа', key: 'margin', width: 18 },
        { header: 'Маржа %', key: 'marginPercent', width: 15 },
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

      // Add data rows with margin calculation
      orderItems.forEach((item) => {
        const itemMargin = item.totalPrice - (item.totalBuyPrice || 0);
        const itemMarginPercent = item.totalPrice > 0 ? (itemMargin / item.totalPrice) * 100 : 0;
        
        const row = itemsSheet.addRow({
          orderNumber: item.orderNumber,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          buyPrice: item.buyPrice || 0,
          totalBuyPrice: item.totalBuyPrice || 0,
          margin: itemMargin,
          marginPercent: itemMarginPercent / 100,
        });
        
        // Условное форматирование по марже товара
        if (itemMarginPercent >= 40) {
          // Высокая маржа - зеленый
          row.getCell('margin').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' },
          };
          row.getCell('marginPercent').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' },
          };
        } else if (itemMarginPercent <= 15) {
          // Низкая маржа - красный
          row.getCell('margin').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' },
          };
          row.getCell('marginPercent').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' },
          };
        }
      });

      // Format currency columns
      itemsSheet.getColumn('price').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('totalPrice').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('buyPrice').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('totalBuyPrice').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('margin').numFmt = '#,##0.00₽';
      itemsSheet.getColumn('marginPercent').numFmt = '0.00%';

      // Align columns
      itemsSheet.getColumn('orderNumber').alignment = { horizontal: 'left' };
      itemsSheet.getColumn('productName').alignment = { horizontal: 'left' };
      itemsSheet.getColumn('price').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('quantity').alignment = { horizontal: 'center' };
      itemsSheet.getColumn('totalPrice').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('buyPrice').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('totalBuyPrice').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('margin').alignment = { horizontal: 'right' };
      itemsSheet.getColumn('marginPercent').alignment = { horizontal: 'right' };

      // ===== ТРЕТИЙ ЛИСТ: ТОП товаров =====
      const topSheet = workbook.addWorksheet('ТОП товаров');
      
      // Агрегируем данные по товарам
      const productStatsMap = new Map<string, ProductStats>();
      
      orderItems.forEach(item => {
        const existing = productStatsMap.get(item.productName);
        const itemMargin = item.totalPrice - (item.totalBuyPrice || 0);
        
        if (existing) {
          existing.totalRevenue += item.totalPrice;
          existing.totalQuantity += item.quantity;
          existing.totalMargin += itemMargin;
        } else {
          productStatsMap.set(item.productName, {
            productName: item.productName,
            totalRevenue: item.totalPrice,
            totalQuantity: item.quantity,
            totalMargin: itemMargin,
            marginPercent: 0,
          });
        }
      });
      
      // Рассчитываем процент маржи
      const productStats: ProductStats[] = Array.from(productStatsMap.values()).map(stat => ({
        ...stat,
        marginPercent: stat.totalRevenue > 0 ? (stat.totalMargin / stat.totalRevenue) * 100 : 0,
      }));
      
      // Сортируем для разных топов
      const topByRevenue = [...productStats].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
      const topByQuantity = [...productStats].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
      const topByMargin = [...productStats].sort((a, b) => b.totalMargin - a.totalMargin).slice(0, 10);
      const worstByMargin = [...productStats].sort((a, b) => a.marginPercent - b.marginPercent).slice(0, 10);
      
      // ===== ТОП-10 по выручке =====
      let currentTopRow = 1;
      
      topSheet.getRow(currentTopRow).getCell(1).value = 'ТОП-10 ТОВАРОВ ПО ВЫРУЧКЕ';
      topSheet.getRow(currentTopRow).getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      topSheet.getRow(currentTopRow).getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      topSheet.mergeCells(currentTopRow, 1, currentTopRow, 5);
      
      currentTopRow++;
      topSheet.getRow(currentTopRow).values = ['№', 'Товар', 'Выручка', 'Количество', 'Маржа'];
      topSheet.getRow(currentTopRow).font = { bold: true };
      topSheet.getRow(currentTopRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      currentTopRow++;
      topByRevenue.forEach((product, index) => {
        const row = topSheet.getRow(currentTopRow);
        row.values = [
          index + 1,
          product.productName,
          product.totalRevenue,
          product.totalQuantity,
          product.totalMargin,
        ];
        row.getCell(3).numFmt = '#,##0.00₽';
        row.getCell(5).numFmt = '#,##0.00₽';
        
        // Цветовая шкала для топ-3
        if (index < 3) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' },
            };
          });
        }
        
        currentTopRow++;
      });
      
      // ===== ТОП-10 по количеству =====
      currentTopRow += 2;
      topSheet.getRow(currentTopRow).getCell(1).value = 'ТОП-10 ТОВАРОВ ПО КОЛИЧЕСТВУ ПРОДАЖ';
      topSheet.getRow(currentTopRow).getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      topSheet.getRow(currentTopRow).getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' },
      };
      topSheet.mergeCells(currentTopRow, 1, currentTopRow, 5);
      
      currentTopRow++;
      topSheet.getRow(currentTopRow).values = ['№', 'Товар', 'Количество', 'Выручка', 'Маржа'];
      topSheet.getRow(currentTopRow).font = { bold: true };
      topSheet.getRow(currentTopRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      currentTopRow++;
      topByQuantity.forEach((product, index) => {
        const row = topSheet.getRow(currentTopRow);
        row.values = [
          index + 1,
          product.productName,
          product.totalQuantity,
          product.totalRevenue,
          product.totalMargin,
        ];
        row.getCell(4).numFmt = '#,##0.00₽';
        row.getCell(5).numFmt = '#,##0.00₽';
        
        if (index < 3) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' },
            };
          });
        }
        
        currentTopRow++;
      });
      
      // ===== ТОП-10 по марже =====
      currentTopRow += 2;
      topSheet.getRow(currentTopRow).getCell(1).value = 'ТОП-10 ТОВАРОВ ПО МАРЖЕ';
      topSheet.getRow(currentTopRow).getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      topSheet.getRow(currentTopRow).getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED7D31' },
      };
      topSheet.mergeCells(currentTopRow, 1, currentTopRow, 5);
      
      currentTopRow++;
      topSheet.getRow(currentTopRow).values = ['№', 'Товар', 'Маржа', 'Маржа %', 'Выручка'];
      topSheet.getRow(currentTopRow).font = { bold: true };
      topSheet.getRow(currentTopRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      currentTopRow++;
      topByMargin.forEach((product, index) => {
        const row = topSheet.getRow(currentTopRow);
        row.values = [
          index + 1,
          product.productName,
          product.totalMargin,
          product.marginPercent / 100,
          product.totalRevenue,
        ];
        row.getCell(3).numFmt = '#,##0.00₽';
        row.getCell(4).numFmt = '0.00%';
        row.getCell(5).numFmt = '#,##0.00₽';
        
        if (index < 3) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' },
            };
          });
        }
        
        currentTopRow++;
      });
      
      // ===== САМЫЕ УБЫТОЧНЫЕ товары =====
      currentTopRow += 2;
      topSheet.getRow(currentTopRow).getCell(1).value = 'САМЫЕ УБЫТОЧНЫЕ ТОВАРЫ (низкая маржа)';
      topSheet.getRow(currentTopRow).getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      topSheet.getRow(currentTopRow).getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' },
      };
      topSheet.mergeCells(currentTopRow, 1, currentTopRow, 5);
      
      currentTopRow++;
      topSheet.getRow(currentTopRow).values = ['№', 'Товар', 'Маржа %', 'Маржа', 'Выручка'];
      topSheet.getRow(currentTopRow).font = { bold: true };
      topSheet.getRow(currentTopRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      currentTopRow++;
      worstByMargin.forEach((product, index) => {
        const row = topSheet.getRow(currentTopRow);
        row.values = [
          index + 1,
          product.productName,
          product.marginPercent / 100,
          product.totalMargin,
          product.totalRevenue,
        ];
        row.getCell(3).numFmt = '0.00%';
        row.getCell(4).numFmt = '#,##0.00₽';
        row.getCell(5).numFmt = '#,##0.00₽';
        
        // Красная подсветка для убыточных
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' },
          };
        });
        
        currentTopRow++;
      });
      
      // Настройка ширины колонок
      topSheet.getColumn(1).width = 8;
      topSheet.getColumn(2).width = 50;
      topSheet.getColumn(3).width = 18;
      topSheet.getColumn(4).width = 18;
      topSheet.getColumn(5).width = 18;
      
      // Выравнивание
      topSheet.eachRow((row) => {
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'right' };
        row.getCell(4).alignment = { horizontal: 'right' };
        row.getCell(5).alignment = { horizontal: 'right' };
      });

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
