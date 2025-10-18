import { Router } from 'express';
import productController from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Публичные маршруты
router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);

// Защищенные маршруты для уведомлений о наличии
router.post('/products/:productId/notify', authMiddleware, productController.subscribeToStockNotification);
router.delete('/products/:productId/notify', authMiddleware, productController.unsubscribeFromStockNotification);
router.get('/products/:productId/notify/check', authMiddleware, productController.checkStockNotificationSubscription);

export default router;

