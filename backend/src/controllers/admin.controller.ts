import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendOrderStatusNotification } from '../services/payment-notification.service';
import { syncOrderWithMoySklad } from '../services/moysklad-sync.service';
import {
  fetchCrmOverview,
  fetchCrmUsers,
  fetchCrmUserDetails,
  fetchRevenueSeries,
  fetchNewUsersSeries,
} from '../services/crm.service';

const parseChatIds = (value?: string | null): number[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !Number.isNaN(id));
};

const getAdminChatIds = (): number[] => parseChatIds(process.env.ADMIN_CHAT_IDS);
const getCrmChatIds = (): number[] => parseChatIds(process.env.CRM_CHAT_IDS);

export type AdminRole = 'ADMIN' | 'CRM' | 'NONE';

export interface AdminAccess {
  role: AdminRole;
  permissions: {
    manageOrders: boolean;
    viewCrm: boolean;
  };
}

const resolveAccess = (req: AuthRequest): AdminAccess => {
  const telegramIdValue = req.user?.telegramId;
  if (!telegramIdValue) {
    return {
      role: 'NONE',
      permissions: {
        manageOrders: false,
        viewCrm: false,
      },
    };
  }

  const telegramId = Number(telegramIdValue);
  if (Number.isNaN(telegramId)) {
    return {
      role: 'NONE',
      permissions: {
        manageOrders: false,
        viewCrm: false,
      },
    };
  }

  const adminIds = getAdminChatIds();
  if (adminIds.includes(telegramId)) {
    return {
      role: 'ADMIN',
      permissions: {
        manageOrders: true,
        viewCrm: true,
      },
    };
  }

  const crmIds = getCrmChatIds();
  if (crmIds.includes(telegramId)) {
    return {
      role: 'CRM',
      permissions: {
        manageOrders: false,
        viewCrm: true,
      },
    };
  }

  return {
    role: 'NONE',
    permissions: {
      manageOrders: false,
      viewCrm: false,
    },
  };
};

export const requireAdmin = async (req: AuthRequest, _res: Response, next: Function) => {
  try {
    if (!req.user?.id) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    const access = resolveAccess(req);
    if (!access.permissions.manageOrders) {
      throw new AppError('Доступ запрещен. Требуются права администратора', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireCrmAccess = async (req: AuthRequest, _res: Response, next: Function) => {
  try {
    if (!req.user?.id) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    const access = resolveAccess(req);
    if (!access.permissions.viewCrm) {
      throw new AppError('Доступ запрещен. Требуются права CRM', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

class AdminController {
  getAccess(req: AuthRequest, res: Response) {
    const access = resolveAccess(req);
    res.json(access);
  }

  // Получить все заказы (с фильтрацией по статусу)
  async getOrders(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;

      const where = status && typeof status === 'string' ? { status: status as any } : {};

      const orders = await prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  price: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              telegramId: true,
              firstName: true,
              lastName: true,
              username: true,
              phone: true,
              bonusPoints: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(orders);
    } catch (error) {
      logger.error('Ошибка при получении заказов для админа:', error);
      throw new AppError('Не удалось получить заказы', 500);
    }
  }

  // Обновить статус заказа
  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { id: orderId } = req.params;
      const { status, adminDeliveryCost, deliveryCost } = req.body;

      if (!status) {
        throw new AppError('Укажите статус заказа', 400);
      }

      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Некорректный статус заказа', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      if (!order) {
        throw new AppError('Заказ не найден', 404);
      }

      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updateData: Record<string, any> = { status };

        const costToSave = adminDeliveryCost ?? deliveryCost;
        if (costToSave !== undefined && costToSave !== null) {
          Object.assign(updateData, {
            adminDeliveryCost: parseFloat(costToSave.toString()),
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: true,
          },
        });

        // Начислить бонусы ТОЛЬКО при статусе DELIVERED и если они еще не начислены
        if (status === 'DELIVERED' && order.bonusEarned > 0 && order.status !== 'DELIVERED') {
          // Проверяем, не были ли уже начислены бонусы
          const existingTransaction = await tx.bonusTransaction.findFirst({
            where: {
              orderId: order.id,
              type: 'EARNED',
            },
          });

          if (!existingTransaction) {
            await tx.user.update({
              where: { id: order.userId },
              data: {
                bonusPoints: {
                  increment: order.bonusEarned,
                },
                totalSpent: {
                  increment: updatedOrder.totalAmount - updatedOrder.deliveryCost,
                },
              },
            });

            await tx.bonusTransaction.create({
              data: {
                userId: order.userId,
                amount: order.bonusEarned,
                type: 'EARNED',
                description: `Начислено за доставленный заказ ${updatedOrder.orderNumber}`,
                orderId: updatedOrder.id,
              },
            });
          }
        }
        return updatedOrder;
      });

      // Синхронизировать с МойСклад при статусе DELIVERED
      if (status === 'DELIVERED') {
        try {
          await syncOrderWithMoySklad(updated);
        } catch (moyskladError) {
          logger.error('Ошибка при синхронизации заказа в МойСклад:', moyskladError);
          // Не выбрасываем ошибку, чтобы основной процесс не прерывался
        }
      }

      // Отправить уведомление пользователю об изменении статуса
      try {
        await sendOrderStatusNotification(updated, status);
      } catch (error) {
        logger.error('Ошибка отправки уведомления пользователю:', error);
      }

      logger.info(`Статус заказа ${order.orderNumber} изменен на ${status}`);

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при обновлении статуса заказа:', error);
      throw new AppError('Не удалось обновить статус заказа', 500);
    }
  }

  // Получить статистику
  async getStats(_req: AuthRequest, res: Response) {
    try {
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        deliveredOrders,
        revenue
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'PROCESSING' } }),
        prisma.order.count({ where: { status: 'DELIVERED' } }),
        prisma.order.aggregate({
          where: { status: 'DELIVERED' },
          _sum: { totalAmount: true },
        }),
      ]);

      res.json({
        totalOrders,
        pendingOrders,
        processingOrders,
        deliveredOrders,
        totalRevenue: revenue._sum.totalAmount || 0,
      });
    } catch (error) {
      logger.error('Ошибка при получении статистики:', error);
      throw new AppError('Не удалось получить статистику', 500);
    }
  }

  async getCrmOverview(req: AuthRequest, res: Response) {
    try {
      const rangeParam = typeof req.query.rangeDays === 'string' ? parseInt(req.query.rangeDays, 10) : undefined;
      const overview = await fetchCrmOverview(rangeParam);
      res.json(overview);
    } catch (error) {
      logger.error('Ошибка при получении CRM-обзора:', error);
      throw new AppError('Не удалось получить данные CRM', 500);
    }
  }

  async getRevenueSeries(req: AuthRequest, res: Response) {
    try {
      const intervalRaw = typeof req.query.interval === 'string' ? req.query.interval : 'daily';
      const allowedIntervals = new Set(['daily', 'weekly', 'monthly']);
      const interval = allowedIntervals.has(intervalRaw) ? (intervalRaw as 'daily' | 'weekly' | 'monthly') : 'daily';

      const periodsParam = typeof req.query.periods === 'string' ? parseInt(req.query.periods, 10) : undefined;
      const periods = periodsParam && !Number.isNaN(periodsParam) ? periodsParam : interval === 'monthly' ? 12 : 14;

      const series = await fetchRevenueSeries({ interval, periods });
      res.json(series);
    } catch (error) {
      logger.error('Ошибка при получении динамики выручки:', error);
      throw new AppError('Не удалось получить данные по выручке', 500);
    }
  }

  async getNewUsersSeries(req: AuthRequest, res: Response) {
    try {
      const intervalRaw = typeof req.query.interval === 'string' ? req.query.interval : 'daily';
      const allowedIntervals = new Set(['daily', 'weekly', 'monthly']);
      const interval = allowedIntervals.has(intervalRaw) ? (intervalRaw as 'daily' | 'weekly' | 'monthly') : 'daily';

      const periodsParam = typeof req.query.periods === 'string' ? parseInt(req.query.periods, 10) : undefined;
      const periods = periodsParam && !Number.isNaN(periodsParam) ? periodsParam : interval === 'monthly' ? 12 : 14;

      const series = await fetchNewUsersSeries({ interval, periods });
      res.json(series);
    } catch (error) {
      logger.error('Ошибка при получении динамики новых пользователей:', error);
      throw new AppError('Не удалось получить динамику новых пользователей', 500);
    }
  }

  async getCrmUsers(req: AuthRequest, res: Response) {
    try {
      const pageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
      const pageSizeParam = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize, 10) : 20;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const sortParam = typeof req.query.sort === 'string' ? req.query.sort : undefined;
      const allowedSorts = ['spent_desc', 'spent_asc', 'newest', 'oldest', 'last_active', 'bonuses_desc'] as const;
      const sort = sortParam && (allowedSorts as readonly string[]).includes(sortParam)
        ? (sortParam as (typeof allowedSorts)[number])
        : undefined;

      const users = await fetchCrmUsers({
        page: Number.isNaN(pageParam) ? 1 : pageParam,
        pageSize: Number.isNaN(pageSizeParam) ? 20 : pageSizeParam,
        search,
        sort,
      });

      res.json(users);
    } catch (error) {
      logger.error('Ошибка при получении списка пользователей CRM:', error);
      throw new AppError('Не удалось получить пользователей', 500);
    }
  }

  async getCrmUserDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Не передан идентификатор пользователя', 400);
      }

      const details = await fetchCrmUserDetails(id);
      if (!details) {
        throw new AppError('Пользователь не найден', 404);
      }

      res.json(details);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Ошибка при получении данных пользователя CRM:', error);
      throw new AppError('Не удалось получить данные пользователя', 500);
    }
  }

  async updateCrmUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Не передан идентификатор пользователя', 400);
      }

      const {
        firstName,
        lastName,
        username,
        phone,
        bonusPoints,
      } = req.body as {
        firstName?: string | null;
        lastName?: string | null;
        username?: string | null;
        phone?: string | null;
        bonusPoints?: number;
      };

      const trimmed = (value?: string | null) => {
        if (value === null || value === undefined) return undefined;
        const normalized = value.trim();
        return normalized.length === 0 ? null : normalized;
      };

      const updateData: Record<string, any> = {};
      const maybeFirstName = trimmed(firstName);
      if (maybeFirstName !== undefined) {
        updateData.firstName = maybeFirstName;
      }
      const maybeLastName = trimmed(lastName);
      if (maybeLastName !== undefined) {
        updateData.lastName = maybeLastName;
      }
      const maybeUsername = trimmed(username);
      if (maybeUsername !== undefined) {
        updateData.username = maybeUsername;
      }
      const maybePhone = trimmed(phone);
      if (maybePhone !== undefined) {
        updateData.phone = maybePhone;
      }
      if (bonusPoints !== undefined) {
        const parsedBonus = Number(bonusPoints);
        if (Number.isNaN(parsedBonus) || !Number.isFinite(parsedBonus)) {
          throw new AppError('Некорректное значение бонусов', 400);
        }
        updateData.bonusPoints = Math.round(parsedBonus);
      }

      if (Object.keys(updateData).length === 0) {
        throw new AppError('Нет данных для обновления', 400);
      }

      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      const details = await fetchCrmUserDetails(id);
      if (!details) {
        throw new AppError('Пользователь не найден после обновления', 404);
      }

      res.json(details);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Ошибка при обновлении пользователя CRM:', error);
      throw new AppError('Не удалось обновить пользователя', 500);
    }
  }
}

export default new AdminController();
