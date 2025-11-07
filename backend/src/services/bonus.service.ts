import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { BonusTransactionType } from '@prisma/client';

export const bonusService = {
  async addBonus(
    userId: string,
    amount: number,
    type: BonusTransactionType,
    description?: string,
    orderId?: string,
    referralId?: string,
    promoCodeId?: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Обновляем баланс пользователя
      await tx.user.update({
        where: { id: userId },
        data: {
          bonusPoints: {
            increment: amount,
          },
        },
      });

      // Создаем транзакцию
      await tx.bonusTransaction.create({
        data: {
          userId,
          amount,
          type,
          description: description || `Начислено ${amount} бонусов`,
          orderId,
          referralId,
          promoCodeId,
        },
      });
    });

    logger.info(`Начислено ${amount} бонусов пользователю ${userId} (тип: ${type})`);
  },
};

