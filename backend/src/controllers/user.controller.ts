import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

class UserController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          photoUrl: true,
          languageCode: true,
          isPremium: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        throw new AppError('Пользователь не найден', 404);
      }

      return res.json({
        user: {
          ...user,
          telegramId: user.telegramId.toString(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Get profile error:', error);
      return res.status(500).json({ error: 'Ошибка получения профиля' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const { phone } = req.body;

      // Валидация телефона (простая)
      if (phone && phone.length < 10) {
        throw new AppError('Некорректный номер телефона', 400);
      }

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
          phone: phone || null,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          photoUrl: true,
          languageCode: true,
          isPremium: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return res.json({
        user: {
          ...user,
          telegramId: user.telegramId.toString(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Update profile error:', error);
      return res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
  }
}

export const userController = new UserController();

