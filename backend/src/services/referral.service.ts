import { Order, Prisma, Referral, ReferralStatus, User } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { generateReferralCode } from '../utils/referral';

const DEFAULT_REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS || 100);

const getClient = (tx?: Prisma.TransactionClient) => tx ?? prisma;

const sanitizeCode = (code: string): string => code.trim().toUpperCase();

export const referralService = {
  async ensureReferralCode(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const client = getClient(tx);
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return user.referralCode;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateReferralCode();
      const exists = await client.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (!exists) {
        await client.user.update({
          where: { id: userId },
          data: { referralCode: code },
        });
        return code;
      }
    }

    logger.error(`Не удалось сгенерировать уникальный реферальный код для пользователя ${userId}`);
    throw new Error('REFERRAL_CODE_GENERATION_FAILED');
  },

  async linkReferralInvite(params: {
    inviteeId: string;
    referralCode: string;
    tx?: Prisma.TransactionClient;
  }): Promise<{ inviter: User; referral: Referral } | null> {
    const { inviteeId, referralCode } = params;
    const client = getClient(params.tx);
    const code = sanitizeCode(referralCode);

    if (!code) {
      return null;
    }

    const inviterRecord = await client.user.findUnique({
      where: { referralCode: code },
    });

    if (!inviterRecord || inviterRecord.id === inviteeId) {
      return null;
    }

    const ensuredCode = inviterRecord.referralCode
      || await referralService.ensureReferralCode(inviterRecord.id, params.tx);
    const inviter = {
      ...inviterRecord,
      referralCode: ensuredCode,
    } as User;

    const existingReferral = await client.referral.findUnique({
      where: { inviteeId },
    });

    if (existingReferral) {
      return null;
    }

    const invitee = await client.user.findUnique({
      where: { id: inviteeId },
      select: {
        referredById: true,
      },
    });

    if (invitee?.referredById) {
      return null;
    }

    const referral = await client.referral.create({
      data: {
        inviterId: inviter.id,
        inviteeId,
        bonusAmount: DEFAULT_REFERRAL_BONUS,
        status: ReferralStatus.PENDING,
        notifiedAt: new Date(),
      },
    });

    await client.user.update({
      where: { id: inviteeId },
      data: {
        referredById: inviter.id,
      },
    });

    return { inviter, referral };
  },

  async qualifyReferral(orderId: string, userId: string, tx?: Prisma.TransactionClient): Promise<Referral | null> {
    const client = getClient(tx);
    const referral = await client.referral.findUnique({
      where: { inviteeId: userId },
    });

    if (!referral || referral.status === ReferralStatus.REWARDED) {
      return null;
    }

    if (referral.firstOrderId && referral.firstOrderId !== orderId) {
      return null;
    }

    if (referral.status === ReferralStatus.QUALIFIED && referral.firstOrderId === orderId) {
      return referral;
    }

    return client.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.QUALIFIED,
        qualifiedAt: new Date(),
        firstOrderId: orderId,
      },
    });
  },

  async revertQualification(orderId: string, tx?: Prisma.TransactionClient): Promise<Referral | null> {
    const client = getClient(tx);
    const referral = await client.referral.findFirst({
      where: {
        firstOrderId: orderId,
        status: { in: [ReferralStatus.QUALIFIED, ReferralStatus.PENDING] },
      },
    });

    if (!referral) {
      return null;
    }

    if (referral.status === ReferralStatus.REWARDED) {
      return null;
    }

    return client.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.PENDING,
        qualifiedAt: null,
        firstOrderId: null,
      },
    });
  },

  async completeReferral(
    order: Order & { user: User },
    tx?: Prisma.TransactionClient,
  ): Promise<{ referral: Referral; inviter: User } | null> {
    const client = getClient(tx);
    const referral = await client.referral.findUnique({
      where: { inviteeId: order.userId },
    });

    if (!referral) {
      return null;
    }

    if (referral.status === ReferralStatus.REWARDED) {
      return null;
    }

    const inviter = await client.user.findUnique({
      where: { id: referral.inviterId },
    });

    if (!inviter) {
      logger.warn(`Инвайтер ${referral.inviterId} не найден для реферального бонуса`);
      return null;
    }

    const updatedReferral = await client.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.REWARDED,
        rewardedAt: new Date(),
        qualifiedAt: referral.qualifiedAt ?? new Date(),
        firstOrderId: referral.firstOrderId ?? order.id,
      },
    });

    await client.user.update({
      where: { id: inviter.id },
      data: {
        bonusPoints: {
          increment: referral.bonusAmount,
        },
      },
    });

    await client.bonusTransaction.create({
      data: {
        userId: inviter.id,
        amount: referral.bonusAmount,
        type: 'REFERRAL',
        description: `Бонус за приглашение пользователя ${order.user.username || order.user.firstName || order.userId}`,
        orderId: order.id,
        referralId: referral.id,
      },
    });

    return { referral: updatedReferral, inviter };
  },

  getReferralBonusAmount(): number {
    return DEFAULT_REFERRAL_BONUS;
  },
};

export type ReferralLinkResult = Awaited<ReturnType<typeof referralService.linkReferralInvite>>;
