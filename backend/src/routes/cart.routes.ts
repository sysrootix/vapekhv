import { Router } from 'express';
import cartController from '../controllers/cart.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/:id', cartController.updateCartItem);
router.delete('/:id', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;

