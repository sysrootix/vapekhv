import { ReferralStatus } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { referralService } from '../services/referral.service';
import { buildReferralLink } from '../utils/referral';

class ReferralController {
  async getOverview(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const userId = req.user.id;
      const referralCode = await referralService.ensureReferralCode(userId);
      const bonusPerReferral = referralService.getReferralBonusAmount();

      const referrals = await prisma.referral.findMany({
        where: { inviterId: userId },
        include: {
          invitee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const rewarded = referrals.filter((item) => item.status === ReferralStatus.REWARDED);
      const qualified = referrals.filter((item) => item.status === ReferralStatus.QUALIFIED);
      const pending = referrals.filter((item) => item.status === ReferralStatus.PENDING);

      const overview = {
        code: referralCode,
        link: buildReferralLink(referralCode),
        bonusPerReferral,
        stats: {
          total: referrals.length,
          rewarded: rewarded.length,
          qualified: qualified.length,
          pending: pending.length,
          totalEarned: rewarded.reduce((sum, item) => sum + item.bonusAmount, 0),
          potential: (qualified.length + pending.length) * bonusPerReferral,
        },
        referrals: referrals.map((item) => ({
          id: item.id,
          status: item.status,
          bonusAmount: item.bonusAmount,
          createdAt: item.createdAt,
          notifiedAt: item.notifiedAt,
          qualifiedAt: item.qualifiedAt,
          rewardedAt: item.rewardedAt,
          invitee: item.invitee,
        })),
      };

      res.json(overview);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Ошибка при получении реферальной информации:', error);
      throw new AppError('Не удалось получить реферальную статистику', 500);
    }
  }
}

export const referralController = new ReferralController();
