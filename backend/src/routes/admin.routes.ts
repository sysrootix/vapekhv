import { Router } from 'express';
import adminController, { requireAdmin } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Все роуты требуют аутентификации и прав администратора
router.use(authMiddleware);
router.use(requireAdmin);

// Получить все заказы (с фильтрацией по статусу)
router.get('/orders', adminController.getOrders.bind(adminController));

// Обновить статус заказа
router.put('/orders/:id/status', adminController.updateOrderStatus.bind(adminController));

// Получить статистику
router.get('/stats', adminController.getStats.bind(adminController));

export default router;
