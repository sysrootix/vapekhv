import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { parseTelegramUser } from '../config/telegram';
import { generateToken } from '../middleware/auth';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

class AuthController {
  async telegramAuth(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { initData } = req.body;

      // Парсим данные пользователя из Telegram
      const telegramUser = parseTelegramUser(initData);

      if (!telegramUser || !telegramUser.id) {
        throw new AppError('Неверные данные Telegram', 400);
      }

      // Ищем или создаем пользователя
      let user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramUser.id) },
      });

      if (!user) {
        // Создаем нового пользователя
        user = await prisma.user.create({
          data: {
            telegramId: BigInt(telegramUser.id),
            username: telegramUser.username || null,
            firstName: telegramUser.first_name || null,
            lastName: telegramUser.last_name || null,
            photoUrl: telegramUser.photo_url || null,
            languageCode: telegramUser.language_code || null,
            isPremium: telegramUser.is_premium || false,
            isBot: telegramUser.is_bot || false,
          },
        });

        logger.info(`New user created: ${user.id} (Telegram ID: ${user.telegramId})`);
      } else {
        // Обновляем время последнего входа
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            username: telegramUser.username || user.username,
            firstName: telegramUser.first_name || user.firstName,
            lastName: telegramUser.last_name || user.lastName,
            photoUrl: telegramUser.photo_url || user.photoUrl,
            isPremium: telegramUser.is_premium || user.isPremium,
          },
        });

        logger.info(`User logged in: ${user.id} (Telegram ID: ${user.telegramId})`);
      }

      // Генерируем JWT токен
      const token = generateToken(user.id, Number(user.telegramId));

      return res.json({
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          isPremium: user.isPremium,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Telegram auth error:', error);
      return res.status(500).json({ error: 'Ошибка авторизации' });
    }
  }

  async verifyToken(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ valid: false });
      }

      // JWT проверка происходит в middleware
      return res.json({ valid: true });
    } catch (error) {
      logger.error('Token verification error:', error);
      return res.status(401).json({ valid: false });
    }
  }
}

export const authController = new AuthController();

