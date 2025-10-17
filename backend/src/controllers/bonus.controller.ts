import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

class BonusController {
  // Получить баланс бонусов и историю
  async getBonusInfo(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          bonusPoints: true,
          totalSpent: true,
          firstOrderDiscount: true,
        },
      });

      const transactions = await prisma.bonusTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const bonusProgram = {
        firstOrderDiscount: 10, // 10% на первый заказ
        earnRate: 5, // 5% бонусами с покупки
        maxUsage: 50, // до 50% можно оплатить бонусами
      };

      res.json({
        balance: user?.bonusPoints || 0,
        totalSpent: user?.totalSpent || 0,
        firstOrderAvailable: user?.firstOrderDiscount || false,
        transactions,
        program: bonusProgram,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении бонусной информации:', error);
      throw new AppError('Не удалось получить информацию о бонусах', 500);
    }
  }

  // Рассчитать бонусы для заказа
  async calculateBonuses(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderAmount, useBonuses } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      if (!orderAmount || orderAmount <= 0) {
        throw new AppError('Некорректная сумма заказа', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          bonusPoints: true,
          firstOrderDiscount: true,
          orders: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new AppError('Пользователь не найден', 404);
      }

      const isFirstOrder = user.orders.length === 0;
      let discount = 0;
      let bonusToUse = 0;
      let bonusToEarn = 0;

      // Скидка 10% на первый заказ
      if (isFirstOrder && user.firstOrderDiscount) {
        discount = Math.floor(orderAmount * 0.1);
      }

      // Использование бонусов (до 50% от суммы)
      if (useBonuses && user.bonusPoints > 0) {
        const maxBonusUsage = Math.floor(orderAmount * 0.5);
        bonusToUse = Math.min(user.bonusPoints, maxBonusUsage);
      }

      // Начисление 5% бонусами
      const finalAmount = orderAmount - discount - bonusToUse;
      bonusToEarn = Math.floor(finalAmount * 0.05);

      res.json({
        orderAmount,
        discount,
        bonusToUse,
        bonusToEarn,
        finalAmount: Math.max(0, finalAmount),
        availableBonuses: user.bonusPoints,
        isFirstOrder,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при расчете бонусов:', error);
      throw new AppError('Не удалось рассчитать бонусы', 500);
    }
  }
}

export default new BonusController();

