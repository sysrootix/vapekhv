import { Order, Prisma, Referral, User } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { referralService } from './referral.service';

type OrderWithUser = Order & { user: User };

interface DeliveryRewardResult {
  referralReward?: {
    referral: Referral;
    inviter: User;
  };
  promoBonusApplied?: boolean;
}

const getClient = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const orderDeliveryService = {
  async applyDeliveryRewards(
    params: {
      orderBefore: OrderWithUser;
      updatedOrder: OrderWithUser;
      tx?: Prisma.TransactionClient;
    }
  ): Promise<DeliveryRewardResult> {
    const { orderBefore, updatedOrder } = params;
    const client = getClient(params.tx);

    if (orderBefore.status === 'DELIVERED' || updatedOrder.status !== 'DELIVERED') {
      return {};
    }

    const result: DeliveryRewardResult = {};

    if (updatedOrder.promoCodeId) {
      try {
        await client.promoCode.update({
          where: { id: updatedOrder.promoCodeId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      } catch (error) {
        logger.error(`Не удалось обновить использование промокода ${updatedOrder.promoCodeId}:`, error);
      }

      if (updatedOrder.promoCodeType === 'BONUS' && updatedOrder.promoBonus > 0) {
        const existingPromoTransaction = await client.bonusTransaction.findFirst({
          where: {
            orderId: updatedOrder.id,
            type: 'PROMO',
          },
        });

        if (!existingPromoTransaction) {
          await client.user.update({
            where: { id: updatedOrder.userId },
            data: {
              bonusPoints: {
                increment: updatedOrder.promoBonus,
              },
            },
          });

          await client.bonusTransaction.create({
            data: {
              userId: updatedOrder.userId,
              amount: updatedOrder.promoBonus,
              type: 'PROMO',
              description: 'Дополнительные бонусы по промокоду',
              orderId: updatedOrder.id,
              promoCodeId: updatedOrder.promoCodeId,
            },
          });

          result.promoBonusApplied = true;
        }
      }
    }

    const referralReward = await referralService.completeReferral(updatedOrder, params.tx);
    if (referralReward) {
      result.referralReward = referralReward;
    }

    return result;
  },
};
