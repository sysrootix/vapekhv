import { Router } from 'express';
import bonusController from '../controllers/bonus.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

// GET /api/bonus - Получить информацию о бонусах
router.get('/', bonusController.getBonusInfo);

// POST /api/bonus/calculate - Рассчитать бонусы для заказа
router.post('/calculate', bonusController.calculateBonuses);

export default router;

