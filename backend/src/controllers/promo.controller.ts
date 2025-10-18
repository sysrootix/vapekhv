import { PromoCodeType } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

type PromoCodePayload = {
  code?: string;
  type?: PromoCodeType;
  value?: number;
  minOrderAmount?: number;
  validFrom?: string | Date;
  validUntil?: string | Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  description?: string | null;
};

const parseDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sanitizePayload = (payload: PromoCodePayload) => {
  const data: Record<string, unknown> = {};

  if (payload.code !== undefined) {
    const trimmed = payload.code.trim().toUpperCase();
    if (!trimmed) {
      throw new AppError('Код промокода не может быть пустым', 400);
    }
    data.code = trimmed;
  }

  if (payload.type !== undefined) {
    if (!Object.values(PromoCodeType).includes(payload.type)) {
      throw new AppError('Некорректный тип промокода', 400);
    }
    data.type = payload.type;
  }

  if (payload.value !== undefined) {
    if (typeof payload.value !== 'number' || Number.isNaN(payload.value) || payload.value <= 0) {
      throw new AppError('Значение промокода должно быть положительным числом', 400);
    }
    data.value = payload.value;
  }

  if (payload.minOrderAmount !== undefined) {
    if (typeof payload.minOrderAmount !== 'number' || Number.isNaN(payload.minOrderAmount) || payload.minOrderAmount < 0) {
      throw new AppError('Минимальная сумма заказа должна быть неотрицательным числом', 400);
    }
    data.minOrderAmount = payload.minOrderAmount;
  }

  if (payload.validFrom !== undefined) {
    const parsed = parseDate(payload.validFrom);
    if (!parsed) {
      throw new AppError('Некорректная дата начала действия', 400);
    }
    data.validFrom = parsed;
  }

  if (payload.validUntil !== undefined) {
    if (payload.validUntil === null) {
      data.validUntil = null;
    } else {
      const parsed = parseDate(payload.validUntil);
      if (!parsed) {
        throw new AppError('Некорректная дата окончания действия', 400);
      }
      data.validUntil = parsed;
    }
  }

  if (payload.usageLimit !== undefined) {
    if (
      payload.usageLimit !== null &&
      (typeof payload.usageLimit !== 'number' || Number.isNaN(payload.usageLimit) || payload.usageLimit < 1)
    ) {
      throw new AppError('Лимит использований должен быть положительным числом или null', 400);
    }
    data.usageLimit = payload.usageLimit ?? null;
  }

  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  if (payload.description !== undefined) {
    data.description = payload.description ? payload.description.trim() : null;
  }

  return data;
};

class PromoController {
  async list(_req: AuthRequest, res: Response) {
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(promoCodes);
  }

  async get(req: AuthRequest, res: Response) {
    const { id } = req.params;

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promoCode) {
      throw new AppError('Промокод не найден', 404);
    }

    res.json(promoCode);
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const payload = sanitizePayload(req.body);

      if (!payload.code || !payload.type || !payload.value) {
        throw new AppError('Укажите код, тип и значение промокода', 400);
      }

      if (!payload.validFrom) {
        payload.validFrom = new Date();
      }

      if (payload.validUntil && payload.validFrom && (payload.validUntil as Date) < (payload.validFrom as Date)) {
        throw new AppError('Дата окончания не может быть раньше даты начала', 400);
      }

      const promoCode = await prisma.promoCode.create({
        data: {
          code: payload.code as string,
          type: payload.type as PromoCodeType,
          value: payload.value as number,
          minOrderAmount: (payload.minOrderAmount as number | undefined) ?? 0,
          validFrom: payload.validFrom as Date,
          validUntil: (payload.validUntil as Date | null) ?? null,
          usageLimit: (payload.usageLimit as number | null | undefined) ?? null,
          isActive: (payload.isActive as boolean | undefined) ?? true,
          description: (payload.description as string | null | undefined) ?? null,
        },
      });

      res.status(201).json(promoCode);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new AppError('Промокод с таким кодом уже существует', 400);
      }

      logger.error('Ошибка создания промокода:', error);
      throw new AppError('Не удалось создать промокод', 500);
    }
  }

  async update(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const payload = sanitizePayload(req.body);

      if (Object.keys(payload).length === 0) {
        throw new AppError('Нет данных для обновления', 400);
      }

      if (payload.validFrom && payload.validUntil && (payload.validUntil as Date) < (payload.validFrom as Date)) {
        throw new AppError('Дата окончания не может быть раньше даты начала', 400);
      }

      const promoCode = await prisma.promoCode.update({
        where: { id },
        data: payload,
      });

      res.json(promoCode);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new AppError('Промокод не найден', 404);
      }

      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new AppError('Промокод с таким кодом уже существует', 400);
      }

      logger.error(`Ошибка обновления промокода ${id}:`, error);
      throw new AppError('Не удалось обновить промокод', 500);
    }
  }

  async remove(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      await prisma.promoCode.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        throw new AppError('Промокод не найден', 404);
      }

      logger.error(`Ошибка удаления промокода ${id}:`, error);
      throw new AppError('Не удалось удалить промокод', 500);
    }
  }
}

export default new PromoController();
