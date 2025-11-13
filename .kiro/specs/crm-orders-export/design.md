# Design Document

## Overview

Функция экспорта отчетов по заказам позволяет CRM-менеджерам и администраторам скачивать детальные отчеты о заказах в формате Excel за выбранный месяц и год. Отчет включает информацию о номере заказа, общей сумме, стоимости доставки для клиента и фактической стоимости доставки для администратора.

Решение состоит из трех основных компонентов:
1. **Frontend UI** - кнопка экспорта и модальное окно выбора периода
2. **Backend API** - endpoint для генерации Excel-файла
3. **Excel Generation** - библиотека для создания .xlsx файлов

## Architecture

### High-Level Flow

```
User clicks "Скачать отчет" 
  → Modal opens with month/year selector
  → User selects period and confirms
  → Frontend sends GET request to /admin/crm/orders/export?month=X&year=Y
  → Backend queries orders from database
  → Backend generates Excel file using exceljs
  → Backend streams file to client
  → Browser downloads file
```

### Technology Stack

**Frontend:**
- React with TypeScript
- Framer Motion для анимаций модального окна
- Lucide React для иконок
- React Query для управления запросами

**Backend:**
- Express.js
- Prisma ORM для работы с базой данных
- ExcelJS для генерации Excel-файлов
- Existing auth middleware для проверки прав доступа

## Components and Interfaces

### Frontend Components

#### 1. ExportReportButton Component
Кнопка для открытия модального окна экспорта.

```typescript
interface ExportReportButtonProps {
  className?: string;
}

// Renders a button with Download icon
// Opens ExportReportModal on click
```

#### 2. ExportReportModal Component
Модальное окно для выбора периода и запуска экспорта.

```typescript
interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportFormState {
  month: number; // 1-12
  year: number;  // e.g., 2024
}

// Features:
// - Month selector (dropdown with Russian month names)
// - Year selector (dropdown with last 3 years)
// - Export button
// - Loading state during export
// - Error handling with user-friendly messages
```

#### 3. API Integration

```typescript
// frontend/src/api/admin.ts

export const adminApi = {
  // ... existing methods
  
  exportOrdersReport: async (month: number, year: number): Promise<Blob> => {
    const response = await apiClient.get('/admin/crm/orders/export', {
      params: { month, year },
      responseType: 'blob',
    });
    return response.data;
  },
};
```

### Backend Components

#### 1. Controller Method

```typescript
// backend/src/controllers/admin.controller.ts

class AdminController {
  async exportOrdersReport(req: AuthRequest, res: Response) {
    // 1. Validate month and year parameters
    // 2. Query orders for the specified period (status = DELIVERED)
    // 3. Generate Excel file
    // 4. Set response headers for file download
    // 5. Stream file to client
  }
}
```

#### 2. Excel Generation Service

```typescript
// backend/src/services/excel-export.service.ts

interface OrderExportRow {
  orderNumber: string;
  totalAmount: number;
  deliveryCost: number;
  adminDeliveryCost: number;
}

class ExcelExportService {
  generateOrdersReport(
    orders: OrderExportRow[],
    month: number,
    year: number
  ): Promise<Buffer> {
    // 1. Create workbook and worksheet
    // 2. Add headers in Russian
    // 3. Add data rows
    // 4. Format columns (currency, alignment)
    // 5. Return buffer
  }
}
```

#### 3. Route Definition

```typescript
// backend/src/routes/admin.routes.ts

router.get(
  '/crm/orders/export',
  requireCrmAccess,
  adminController.exportOrdersReport
);
```

## Data Models

### Database Query

Используем существующую модель `Order` из Prisma schema:

```typescript
// Query structure
const orders = await prisma.order.findMany({
  where: {
    status: 'DELIVERED',
    createdAt: {
      gte: new Date(year, month - 1, 1),
      lt: new Date(year, month, 1),
    },
  },
  select: {
    orderNumber: true,
    totalAmount: true,
    deliveryCost: true,
    adminDeliveryCost: true,
  },
  orderBy: {
    createdAt: 'asc',
  },
});
```

### Excel File Structure

**Filename:** `orders_report_YYYY_MM.xlsx`

**Sheets:**

#### 1. "Заказы" (Orders Summary)

**Columns:**
| Column | Header (Russian) | Data Type | Format |
|--------|------------------|-----------|---------|
| A | Номер заказа | String | Text |
| B | Сумма заказа | Number | Currency (0.00₽) |
| C | Человек заплатил за доставку | Number | Currency (0.00₽) |
| D | Мы заплатили за такси | Number | Currency (0.00₽) |
| E | Бонусов начислено | Number | Currency (0₽) |
| F | Бонусов списано | Number | Currency (0₽) |
| G | Скидка по промокоду | Number | Currency (0.00₽) |
| H | Бесплатная доставка по промокоду | String | Text (Да/Нет) |

**Conditional Formatting:**
- Высокая маржа (≥40%) - зеленый фон (#C6EFCE)
- Низкая маржа (≤15%) - красный фон (#FFC7CE)
- Заказы с промокодами - оранжевый фон (#FFF4E6)

**Summary Blocks:**

1. **ИТОГОВЫЕ ПОКАЗАТЕЛИ:**
   - Выручка
   - Себестоимость
   - Маржа
   - Наценка (%)
   - Маржинальность (%)
   - Заплатили за доставку
   - Компенсировано клиентами (доставка)

2. **ЗАТРАТЫ:**
   - Потратили на доставку
   - Мой склад, сервер
   - 5% Продавцам от выручки
   - 10% Дане от выручки
   - ФОД
   - Ревизия (заполняется вручную)
   - Итого затраты (заполняется вручную)
   - Чистая прибыль (заполняется вручную)

3. **АНАЛИТИКА:**
   - Количество заказов
   - Средний чек
   - Глубина чека (товаров в заказе)
   - Средняя цена товара
   - Всего товаров продано
   - Средняя стоимость доставки
   - Компенсация доставки клиентами (%)
   - Средняя маржа на заказ
   - Использование бонусов (%)
   - Использование промокодов (%)
   - ROI (Return on Investment)
   - Средняя скидка по промокоду

4. **БОНУСЫ И ПРОМОКОДЫ:**
   - Всего начислено бонусов
   - Всего списано бонусов
   - Заказов с бонусами
   - Всего скидок по промокодам
   - Заказов с промокодами
   - Бесплатных доставок по промокоду
   - Выручка с промокодами
   - Выручка без промокодов

#### 2. "Товары" (Items Detail)

**Columns:**
| Column | Header (Russian) | Data Type | Format |
|--------|------------------|-----------|---------|
| A | Номер заказа | String | Text |
| B | Позиция | String | Text |
| C | Цена товара | Number | Currency (0.00₽) |
| D | Кол-во | Number | Integer |
| E | Сумма | Number | Currency (0.00₽) |
| F | Себестоимость | Number | Currency (0.00₽) |
| G | Сумма себестоимости | Number | Currency (0.00₽) |
| H | Маржа | Number | Currency (0.00₽) |
| I | Маржа % | Number | Percent (0.00%) |

**Conditional Formatting:**
- Высокая маржа (≥40%) - зеленый фон для колонок H и I
- Низкая маржа (≤15%) - красный фон для колонок H и I

#### 3. "ТОП товаров" (Top Products)

**Sections:**

1. **ТОП-10 ТОВАРОВ ПО ВЫРУЧКЕ:**
   - Топ-3 с золотым/серебряным/бронзовым фоном
   - Колонки: №, Товар, Выручка, Количество, Маржа

2. **ТОП-10 ТОВАРОВ ПО КОЛИЧЕСТВУ ПРОДАЖ:**
   - Топ-3 с золотым/серебряным/бронзовым фоном
   - Колонки: №, Товар, Количество, Выручка, Маржа

3. **ТОП-10 ТОВАРОВ ПО МАРЖЕ:**
   - Топ-3 с золотым/серебряным/бронзовым фоном
   - Колонки: №, Товар, Маржа, Маржа %, Выручка

4. **САМЫЕ УБЫТОЧНЫЕ ТОВАРЫ (низкая маржа):**
   - Красный фон для всех строк
   - Колонки: №, Товар, Маржа %, Маржа, Выручка

**Styling:**
- Header row: Bold, background color, centered
- Data rows: Left-aligned for text, right-aligned for numbers
- Column widths: Auto-fit to content
- Number format: Russian currency with 2 decimal places
- Color coding for visual hierarchy

## Error Handling

### Frontend Error Scenarios

1. **Invalid month/year selection**
   - Validation before API call
   - Show error message in modal

2. **Network error**
   - Display toast notification: "Ошибка сети. Попробуйте позже."
   - Keep modal open for retry

3. **Server error (500)**
   - Display toast notification: "Ошибка сервера. Попробуйте позже."
   - Log error to console

4. **Unauthorized (403)**
   - Display toast notification: "Нет доступа к экспорту отчетов"
   - Close modal

### Backend Error Scenarios

1. **Invalid parameters**
   - Return 400 with message: "Некорректные параметры месяца или года"

2. **No orders found**
   - Generate empty Excel with headers only
   - Return 200 with file

3. **Database error**
   - Log error
   - Return 500 with message: "Ошибка при получении данных"

4. **Excel generation error**
   - Log error
   - Return 500 with message: "Ошибка при создании отчета"

## Testing Strategy

### Unit Tests (Optional)

**Backend:**
- Test order query with different date ranges
- Test Excel generation with sample data
- Test error handling for invalid parameters

**Frontend:**
- Test modal open/close behavior
- Test form validation
- Test API call with correct parameters

### Integration Tests (Optional)

- Test complete flow from button click to file download
- Test with empty result set
- Test with large dataset (1000+ orders)

### Manual Testing Checklist

**Functional:**
- [ ] Button appears in CRM Overview tab
- [ ] Modal opens on button click
- [ ] Month selector shows all 12 months in Russian
- [ ] Year selector shows last 3 years
- [ ] Export button is disabled during loading
- [ ] File downloads with correct name format
- [ ] Excel file opens without errors
- [ ] Data matches database records
- [ ] Empty period generates file with headers only

**UI/UX:**
- [ ] Modal is responsive on mobile
- [ ] Loading spinner appears during export
- [ ] Success/error messages are clear
- [ ] Modal closes after successful export
- [ ] Button is accessible via keyboard

**Performance:**
- [ ] Export completes in <10s for 1000 orders
- [ ] No memory leaks on repeated exports
- [ ] File size is reasonable (<5MB for 1000 orders)

## Security Considerations

1. **Authentication & Authorization**
   - Use existing `requireCrmAccess` middleware
   - Verify user has CRM or Admin role

2. **Input Validation**
   - Validate month is 1-12
   - Validate year is reasonable (e.g., 2020-2030)
   - Sanitize parameters to prevent SQL injection (handled by Prisma)

3. **Rate Limiting**
   - Consider adding rate limit for export endpoint (e.g., 10 requests per minute)
   - Prevent abuse and server overload

4. **Data Privacy**
   - Only include necessary order information
   - No personal user data (names, phones) in export
   - Audit log for export actions (optional future enhancement)

## Implementation Notes

### Library Selection: ExcelJS

**Why ExcelJS:**
- Pure JavaScript, no native dependencies
- Supports streaming for large datasets
- Rich formatting options
- Active maintenance and good documentation
- Already used in similar Node.js projects

**Installation:**
```bash
npm install exceljs
npm install --save-dev @types/exceljs
```

### File Download Implementation

**Backend:**
```typescript
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', `attachment; filename="orders_report_${year}_${month.toString().padStart(2, '0')}.xlsx"`);
res.send(buffer);
```

**Frontend:**
```typescript
const blob = await adminApi.exportOrdersReport(month, year);
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `orders_report_${year}_${month.toString().padStart(2, '0')}.xlsx`;
link.click();
window.URL.revokeObjectURL(url);
```

### Performance Optimization

1. **Database Query**
   - Use indexed fields (createdAt, status)
   - Select only required fields
   - Limit to reasonable date range

2. **Excel Generation**
   - Stream data for large datasets (if needed in future)
   - Use efficient cell formatting
   - Avoid unnecessary calculations

3. **Caching**
   - Consider caching generated reports for same period (future enhancement)
   - Cache invalidation on new orders

## Future Enhancements

1. **Additional Export Formats**
   - CSV export option
   - PDF export with charts

2. **Advanced Filtering**
   - Filter by order status
   - Filter by date range (not just month)
   - Filter by customer segment

3. **Scheduled Reports**
   - Automatic monthly report generation
   - Email delivery to admins

4. **Additional Columns**
   - Customer name/phone
   - Product details
   - Payment method
   - Delivery address

5. **Export History**
   - Track who exported what and when
   - Download previous exports
