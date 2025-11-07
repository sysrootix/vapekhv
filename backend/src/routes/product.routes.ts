import { Router } from 'express';
import productController from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Публичные маршруты
router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);

// Защищенные маршруты (должны быть перед /products/:id чтобы не конфликтовать)
router.post('/products/request', authMiddleware, productController.requestProduct);
router.post('/products/:productId/notify', authMiddleware, productController.subscribeToStockNotification);
router.delete('/products/:productId/notify', authMiddleware, productController.unsubscribeFromStockNotification);
router.get('/products/:productId/notify/check', authMiddleware, productController.checkStockNotificationSubscription);
router.post('/products/:id/view', authMiddleware, productController.trackProductView);
router.get('/products/recent', authMiddleware, productController.getRecentProducts);

// Публичный маршрут для получения похожих товаров (должен быть перед /products/:id)
router.get('/products/:id/similar', productController.getSimilarProducts);

// Публичный маршрут для получения товара (должен быть последним)
router.get('/products/:id', productController.getProduct);

export default router;

