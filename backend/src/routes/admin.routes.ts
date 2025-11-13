import { Router } from 'express';
import adminController, { requireAdmin, requireCrmAccess } from '../controllers/admin.controller';
import audienceController from '../controllers/audience.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/access', adminController.getAccess.bind(adminController));

// Получить все заказы (с фильтрацией по статусу)
router.get('/orders', requireAdmin, adminController.getOrders.bind(adminController));

// Обновить статус заказа
router.put('/orders/:id/status', requireAdmin, adminController.updateOrderStatus.bind(adminController));

// Получить историю заказа
router.get('/orders/:id/history', requireAdmin, adminController.getOrderHistory.bind(adminController));

// Получить статистику
router.get('/stats', requireCrmAccess, adminController.getStats.bind(adminController));

// CRM endpoints
router.get('/crm/overview', requireCrmAccess, adminController.getCrmOverview.bind(adminController));
router.get('/crm/revenue', requireCrmAccess, adminController.getRevenueSeries.bind(adminController));
router.get('/crm/new-users', requireCrmAccess, adminController.getNewUsersSeries.bind(adminController));
router.get('/crm/orders', requireCrmAccess, adminController.getOrdersSeries.bind(adminController));
router.get('/crm/products', requireCrmAccess, adminController.getProductsSeries.bind(adminController));
router.get('/crm/basket-depth', requireCrmAccess, adminController.getBasketDepthSeries.bind(adminController));
router.get('/crm/cohorts', requireCrmAccess, adminController.getCohorts.bind(adminController));
router.get('/crm/ltv', requireCrmAccess, adminController.getLTV.bind(adminController));
router.get('/crm/top-products', requireCrmAccess, adminController.getTopProducts.bind(adminController));
router.get('/crm/order-time-analysis', requireCrmAccess, adminController.getOrderTimeAnalysis.bind(adminController));
router.get('/crm/bonus-analysis', requireCrmAccess, adminController.getBonusAnalysis.bind(adminController));
router.get('/crm/repeat-purchase-analysis', requireCrmAccess, adminController.getRepeatPurchaseAnalysis.bind(adminController));
router.get('/crm/rfm-analysis', requireCrmAccess, adminController.getRFMAnalysis.bind(adminController));
router.get('/crm/users', requireCrmAccess, adminController.getCrmUsers.bind(adminController));
router.get('/crm/users/:id', requireCrmAccess, adminController.getCrmUserDetails.bind(adminController));
router.patch('/crm/users/:id', requireCrmAccess, adminController.updateCrmUser.bind(adminController));

// Audience management
router.get('/crm/audiences', requireCrmAccess, audienceController.list.bind(audienceController));
router.post('/crm/audiences/preview', requireCrmAccess, audienceController.previewFilters.bind(audienceController));
router.get('/crm/audiences/:id/preview', requireCrmAccess, audienceController.previewAudience.bind(audienceController));
router.post('/crm/audiences', requireCrmAccess, audienceController.create.bind(audienceController));
router.get('/crm/audiences/:id', requireCrmAccess, audienceController.get.bind(audienceController));
router.put('/crm/audiences/:id', requireCrmAccess, audienceController.update.bind(audienceController));
router.delete('/crm/audiences/:id', requireCrmAccess, audienceController.remove.bind(audienceController));

// Broadcast endpoints
router.post('/crm/broadcast/stats', requireCrmAccess, adminController.getBroadcastStats.bind(adminController));
router.post('/crm/broadcast/send', requireCrmAccess, adminController.sendBroadcast.bind(adminController));

// Export endpoints
router.get('/crm/orders/export', requireCrmAccess, adminController.exportOrdersReport.bind(adminController));

export default router;
