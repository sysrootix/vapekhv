import { Router } from 'express';
import productController from '../controllers/product.controller';

const router = Router();

// Публичные маршруты
router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);

export default router;

