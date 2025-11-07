import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Авторизация через Telegram Web App
router.post(
  '/telegram',
  [
    body('initData').notEmpty().withMessage('InitData обязателен'),
  ],
  authController.telegramAuth
);

// Проверка токена
router.get('/verify', authController.verifyToken);

// Получить конфигурацию бота (публичный endpoint)
router.get('/bot-config', authController.getBotConfig);

export default router;

