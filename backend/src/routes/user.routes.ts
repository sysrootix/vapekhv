import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { userController } from '../controllers/user.controller';

const router = Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

// Получить профиль текущего пользователя
router.get('/profile', userController.getProfile);

// Обновить профиль
router.put('/profile', userController.updateProfile);

export default router;

