import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/create', orderController.createOrder);
router.post('/:id/cancel', orderController.cancelOrder);

export default router;
