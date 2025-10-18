import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/create', orderController.createOrder);
router.post('/:id/upload-receipt', upload.single('receipt'), orderController.uploadReceipt);
router.post('/:id/confirm-payment', orderController.confirmPayment);
router.put('/:id/status', orderController.updateOrderStatus);
router.post('/:id/cancel', orderController.cancelOrder);
router.post('/:id/confirm-delivery', orderController.confirmDelivery);

export default router;
