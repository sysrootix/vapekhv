import { Router } from 'express';
import reviewController from '../controllers/review.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Защищенные маршруты
router.post('/', authMiddleware, reviewController.createReview);
router.get('/pending', authMiddleware, reviewController.getPendingReviews);

// Публичные маршруты
router.get('/random', reviewController.getRandomReviews);
router.get('/all', reviewController.getAllReviews);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/product/:productId/rating', reviewController.getProductRating);

export default router;

