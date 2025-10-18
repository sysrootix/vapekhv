import { Router } from 'express';
import adminController, { requireAdmin, requireCrmAccess } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/access', adminController.getAccess.bind(adminController));

// Получить все заказы (с фильтрацией по статусу)
router.get('/orders', requireAdmin, adminController.getOrders.bind(adminController));

// Обновить статус заказа
router.put('/orders/:id/status', requireAdmin, adminController.updateOrderStatus.bind(adminController));

// Получить статистику
router.get('/stats', requireCrmAccess, adminController.getStats.bind(adminController));

// CRM endpoints
router.get('/crm/overview', requireCrmAccess, adminController.getCrmOverview.bind(adminController));
router.get('/crm/revenue', requireCrmAccess, adminController.getRevenueSeries.bind(adminController));
router.get('/crm/new-users', requireCrmAccess, adminController.getNewUsersSeries.bind(adminController));
router.get('/crm/users', requireCrmAccess, adminController.getCrmUsers.bind(adminController));
router.get('/crm/users/:id', requireCrmAccess, adminController.getCrmUserDetails.bind(adminController));
router.patch('/crm/users/:id', requireCrmAccess, adminController.updateCrmUser.bind(adminController));

export default router;
