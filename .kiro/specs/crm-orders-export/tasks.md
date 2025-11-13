# Implementation Plan

- [x] 1. Set up backend dependencies and Excel generation service
  - Install exceljs library in backend
  - Create Excel export service with order report generation method
  - _Requirements: 1.4, 1.5, 4.5_

- [x] 2. Implement backend API endpoint for orders export
  - [x] 2.1 Add controller method for export in admin.controller.ts
    - Validate month and year parameters
    - Query DELIVERED orders for specified period
    - Generate Excel file using service
    - Set response headers for file download
    - Stream file to client
    - _Requirements: 1.4, 2.2, 3.1, 4.1, 4.2_
  
  - [x] 2.2 Add route for export endpoint
    - Create GET route at /admin/crm/orders/export
    - Apply requireCrmAccess middleware
    - Wire to controller method
    - _Requirements: 1.1, 4.2_

- [x] 3. Create frontend export UI components
  - [x] 3.1 Create ExportReportModal component
    - Build modal with month and year selectors
    - Add Russian month names
    - Implement form state management
    - Add loading state during export
    - Handle errors with user-friendly messages
    - _Requirements: 1.2, 1.3, 4.2_
  
  - [x] 3.2 Create ExportReportButton component
    - Add button with Download icon
    - Integrate modal open/close logic
    - _Requirements: 1.1_
  
  - [x] 3.3 Add API method for export in admin.ts
    - Create exportOrdersReport method
    - Configure blob response type
    - Handle file download in browser
    - _Requirements: 1.4, 1.5_

- [x] 4. Integrate export button into CRM page
  - Add ExportReportButton to Overview tab
  - Position near period selector or metrics section
  - Ensure proper styling and responsiveness
  - _Requirements: 1.1_

- [x] 5. Implement Excel file generation logic
  - [x] 5.1 Create workbook and worksheet structure
    - Set up ExcelJS workbook
    - Create worksheet with name "Заказы"
    - _Requirements: 2.1, 4.4_
  
  - [x] 5.2 Add headers and format columns
    - Add Russian column headers
    - Format currency columns with 2 decimal places
    - Style header row (bold, background, centered)
    - Set column widths
    - _Requirements: 2.3, 2.4, 3.3_
  
  - [x] 5.3 Populate data rows from orders
    - Map order data to Excel rows
    - Handle null adminDeliveryCost values
    - Format numbers as currency
    - _Requirements: 2.2, 2.3, 2.5, 3.1, 3.2_

- [ ] 6. Add error handling and validation
  - Validate month (1-12) and year parameters on backend
  - Return appropriate error responses (400, 500)
  - Display error messages in frontend modal
  - Handle empty result sets gracefully
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Enhanced Excel features
  - [x] 7.1 Add bonus and promo code columns to Orders sheet
    - Бонусов начислено
    - Бонусов списано
    - Скидка по промокоду
    - Бесплатная доставка по промокоду
  
  - [x] 7.2 Add summary blocks to Orders sheet
    - ИТОГОВЫЕ ПОКАЗАТЕЛИ (выручка, себестоимость, маржа, наценка, маржинальность)
    - ЗАТРАТЫ (доставка, МойСклад, ФОД, ревизия)
    - АНАЛИТИКА (средний чек, глубина чека, ROI, использование бонусов/промокодов)
    - БОНУСЫ И ПРОМОКОДЫ (начислено, списано, эффективность)
  
  - [x] 7.3 Add Items detail sheet
    - Детализация по товарам с маржой
    - Условное форматирование по марже (зеленый/красный)
  
  - [x] 7.4 Add Top Products sheet
    - ТОП-10 по выручке (с золотым/серебряным/бронзовым фоном для топ-3)
    - ТОП-10 по количеству продаж
    - ТОП-10 по марже
    - Самые убыточные товары (красный фон)
  
  - [x] 7.5 Implement conditional formatting
    - Высокая маржа (≥40%) - зеленый фон
    - Низкая маржа (≤15%) - красный фон
    - Заказы с промокодами - оранжевый фон
