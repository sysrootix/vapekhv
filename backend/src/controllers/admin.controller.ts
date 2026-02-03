import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendOrderStatusNotification } from '../services/payment-notification.service';
import { syncOrderWithMoySklad, deleteOrderFromMoySklad } from '../services/moysklad-sync.service';
import { orderDeliveryService } from '../services/order-delivery.service';
import { sendReferralRewardNotification } from '../services/bot.service';
import { referralService } from '../services/referral.service';
import {
  fetchCrmOverview,
  fetchCrmUsers,
  fetchCrmUserDetails,
  fetchRevenueSeries,
  fetchNewUsersSeries,
  fetchOrdersSeries,
  fetchProductsSeries,
  fetchBasketDepthSeries,
} from '../services/crm.service';
import {
  getOrderTimeAnalysis,
  getBonusAnalysis,
  getRepeatPurchaseAnalysis,
  getRFMAnalysis,
} from '../services/analytics.service';
import {
  sendBroadcast,
  getBroadcastStats,
  BroadcastMessage,
  BroadcastTarget,
} from '../services/broadcast.service';
import { excelExportService } from '../services/excel-export.service';

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

  const crmIds = getCrmChatIds();
  const adminIds = getAdminChatIds();
  const isAdmin = adminIds.includes(telegramId);
  const isCrm = crmIds.includes(telegramId);

  if (isAdmin) {
    return {
      role: 'ADMIN',
      permissions: {
        manageOrders: true,
        viewCrm: isCrm,
      },
    };
  }

  if (isCrm) {
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

      const { updatedOrder, deliveryEffects } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            promoCode: true,
          },
        });

        // Записать изменение статуса в историю
        if (order.status !== status) {
          await tx.orderHistory.create({
            data: {
              orderId: order.id,
              changedBy: req.user?.id || 'SYSTEM',
              changedByName: req.user?.firstName
                ? `${req.user.firstName}${req.user.lastName ? ' ' + req.user.lastName : ''}`.trim()
                : req.user?.username || 'Администратор',
              field: 'status',
              oldValue: order.status,
              newValue: status,
            },
          });
        }

        // Записать изменение стоимости доставки в историю
        if (costToSave !== undefined && costToSave !== null && order.adminDeliveryCost !== parseFloat(costToSave.toString())) {
          await tx.orderHistory.create({
            data: {
              orderId: order.id,
              changedBy: req.user?.id || 'SYSTEM',
              changedByName: req.user?.firstName
                ? `${req.user.firstName}${req.user.lastName ? ' ' + req.user.lastName : ''}`.trim()
                : req.user?.username || 'Администратор',
              field: 'adminDeliveryCost',
              oldValue: order.adminDeliveryCost?.toString() || null,
              newValue: costToSave.toString(),
            },
          });
        }

        if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
          await referralService.revertQualification(order.id, tx);
        }

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
        const deliveryEffects = await orderDeliveryService.applyDeliveryRewards({
          orderBefore: order,
          updatedOrder,
          tx,
        });

        return { updatedOrder, deliveryEffects };
      });

      // Синхронизировать с МойСклад при статусе DELIVERED
      if (status === 'DELIVERED') {
        try {
          await syncOrderWithMoySklad(updatedOrder);
        } catch (moyskladError) {
          logger.error('Ошибка при синхронизации заказа в МойСклад:', moyskladError);
          // Не выбрасываем ошибку, чтобы основной процесс не прерывался
        }
      }

      // Удалить заказ из МойСклад при статусе CANCELLED
      if (status === 'CANCELLED') {
        try {
          await deleteOrderFromMoySklad(updatedOrder.orderNumber);
        } catch (moyskladError) {
          logger.error('Ошибка при удалении заказа из МойСклад:', moyskladError);
          // Не выбрасываем ошибку, чтобы основной процесс не прерывался
        }
      }

      // Отправить уведомление пользователю об изменении статуса
      try {
        await sendOrderStatusNotification(updatedOrder, status);
      } catch (error) {
        logger.error('Ошибка отправки уведомления пользователю:', error);
      }

      if (deliveryEffects?.referralReward?.inviter?.telegramId) {
        try {
          await sendReferralRewardNotification(deliveryEffects.referralReward.inviter.telegramId, {
            inviteeName: updatedOrder.user.firstName || updatedOrder.user.username || 'Ваш реферал',
            bonusAmount: deliveryEffects.referralReward.referral.bonusAmount,
          });
        } catch (notificationError) {
          logger.error('Ошибка отправки уведомления о реферальном бонусе:', notificationError);
        }
      }

      logger.info(`Статус заказа ${order.orderNumber} изменен на ${status}`);

      res.json(updatedOrder);
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
      const startDateParam = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateParam = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const compareStartDateParam = typeof req.query.compareStartDate === 'string' ? req.query.compareStartDate : undefined;
      const compareEndDateParam = typeof req.query.compareEndDate === 'string' ? req.query.compareEndDate : undefined;

      const overview = await fetchCrmOverview({
        rangeDays: rangeParam,
        startDate: startDateParam,
        endDate: endDateParam,
        compareStartDate: compareStartDateParam,
        compareEndDate: compareEndDateParam,
      });
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

  async getOrdersSeries(req: AuthRequest, res: Response) {
    try {
      const intervalRaw = typeof req.query.interval === 'string' ? req.query.interval : 'daily';
      const allowedIntervals = new Set(['daily', 'weekly', 'monthly']);
      const interval = allowedIntervals.has(intervalRaw) ? (intervalRaw as 'daily' | 'weekly' | 'monthly') : 'daily';

      const periodsParam = typeof req.query.periods === 'string' ? parseInt(req.query.periods, 10) : undefined;
      const periods = periodsParam && !Number.isNaN(periodsParam) ? periodsParam : interval === 'monthly' ? 12 : 14;

      const series = await fetchOrdersSeries({ interval, periods });
      res.json(series);
    } catch (error) {
      logger.error('Ошибка при получении динамики заказов:', error);
      throw new AppError('Не удалось получить динамику заказов', 500);
    }
  }

  async getProductsSeries(req: AuthRequest, res: Response) {
    try {
      const intervalRaw = typeof req.query.interval === 'string' ? req.query.interval : 'daily';
      const allowedIntervals = new Set(['daily', 'weekly', 'monthly']);
      const interval = allowedIntervals.has(intervalRaw) ? (intervalRaw as 'daily' | 'weekly' | 'monthly') : 'daily';

      const periodsParam = typeof req.query.periods === 'string' ? parseInt(req.query.periods, 10) : undefined;
      const periods = periodsParam && !Number.isNaN(periodsParam) ? periodsParam : interval === 'monthly' ? 12 : 14;

      const series = await fetchProductsSeries({ interval, periods });
      res.json(series);
    } catch (error) {
      logger.error('Ошибка при получении динамики товаров:', error);
      throw new AppError('Не удалось получить динамику товаров', 500);
    }
  }

  async getBasketDepthSeries(req: AuthRequest, res: Response) {
    try {
      const intervalRaw = typeof req.query.interval === 'string' ? req.query.interval : 'daily';
      const allowedIntervals = new Set(['daily', 'weekly', 'monthly']);
      const interval = allowedIntervals.has(intervalRaw) ? (intervalRaw as 'daily' | 'weekly' | 'monthly') : 'daily';

      const periodsParam = typeof req.query.periods === 'string' ? parseInt(req.query.periods, 10) : undefined;
      const periods = periodsParam && !Number.isNaN(periodsParam) ? periodsParam : interval === 'monthly' ? 12 : 14;

      const series = await fetchBasketDepthSeries({ interval, periods });
      res.json(series);
    } catch (error) {
      logger.error('Ошибка при получении динамики глубины чека:', error);
      throw new AppError('Не удалось получить динамику глубины чека', 500);
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

  // Получить историю изменений заказа
  async getOrderHistory(req: AuthRequest, res: Response) {
    try {
      const { id: orderId } = req.params;

      if (!orderId) {
        throw new AppError('Не передан идентификатор заказа', 400);
      }

      // Проверить, существует ли заказ
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true },
      });

      if (!order) {
        throw new AppError('Заказ не найден', 404);
      }

      // Получить историю изменений
      const history = await prisma.orderHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        orderNumber: order.orderNumber,
        history,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Ошибка при получении истории заказа:', error);
      throw new AppError('Не удалось получить историю заказа', 500);
    }
  }

  // Получить когортный анализ
  async getCohorts(_req: AuthRequest, res: Response) {
    try {
      // Группировка пользователей по месяцу регистрации
      const users = await prisma.user.findMany({
        select: {
          id: true,
          createdAt: true,
          totalSpent: true,
          orders: {
            select: {
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      });

      // Группируем по месяцам регистрации
      const cohortMap = new Map<string, any>();

      users.forEach((user) => {
        const cohortMonth = user.createdAt.toISOString().substring(0, 7); // YYYY-MM

        if (!cohortMap.has(cohortMonth)) {
          cohortMap.set(cohortMonth, {
            cohort: cohortMonth,
            usersCount: 0,
            totalRevenue: 0,
            ordersCount: 0,
            activeUsers: 0,
            avgRevenue: 0,
            averageOrderValue: 0,
          });
        }

        const cohort = cohortMap.get(cohortMonth);
        cohort.usersCount++;
        
        // Считаем выручку и заказы только из доставленных заказов
        const deliveredOrders = user.orders.filter((o) => o.status === 'DELIVERED');
        const cohortRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        cohort.totalRevenue += cohortRevenue;
        cohort.ordersCount += deliveredOrders.length;

        if (deliveredOrders.length > 0) {
          cohort.activeUsers++;
        }
      });

      // Рассчитываем средний доход на пользователя и средний чек
      const cohorts = Array.from(cohortMap.values()).map((cohort) => ({
        ...cohort,
        avgRevenue: cohort.usersCount > 0 ? cohort.totalRevenue / cohort.usersCount : 0,
        averageOrderValue: cohort.ordersCount > 0 ? cohort.totalRevenue / cohort.ordersCount : 0,
        retentionRate: cohort.usersCount > 0 ? (cohort.activeUsers / cohort.usersCount) * 100 : 0,
      })).sort((a, b) => b.cohort.localeCompare(a.cohort));

      res.json({ cohorts });
    } catch (error) {
      logger.error('Ошибка при получении когортного анализа:', error);
      throw new AppError('Не удалось получить когортный анализ', 500);
    }
  }

  // Получить LTV (Lifetime Value) клиентов
  async getLTV(_req: AuthRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          totalSpent: true,
          createdAt: true,
          orders: {
            where: { status: 'DELIVERED' },
            select: {
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      });

      const now = new Date();
      let totalLTV = 0;
      let totalCustomers = 0;
      const segments = {
        new: { count: 0, ltv: 0 },
        active: { count: 0, ltv: 0 },
        loyal: { count: 0, ltv: 0 },
      };

      users.forEach((user) => {
        // LTV = сумма всех доставленных заказов (включая доставку)
        const ltv = user.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const daysSinceRegistration = Math.floor(
          (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const ordersCount = user.orders.length;

        // Считаем LTV только для пользователей с доставленными заказами
        if (ltv > 0) {
          totalLTV += ltv;
          totalCustomers++;

          if (daysSinceRegistration < 30) {
            segments.new.count++;
            segments.new.ltv += ltv;
          } else if (ordersCount >= 5) {
            segments.loyal.count++;
            segments.loyal.ltv += ltv;
          } else {
            segments.active.count++;
            segments.active.ltv += ltv;
          }
        }
      });

      const avgLTV = totalCustomers > 0 ? totalLTV / totalCustomers : 0;

      res.json({
        totalCustomers,
        averageLTV: avgLTV,
        totalLTV,
        segments: {
          new: {
            count: segments.new.count,
            avgLTV: segments.new.count > 0 ? segments.new.ltv / segments.new.count : 0,
            totalLTV: segments.new.ltv,
          },
          active: {
            count: segments.active.count,
            avgLTV: segments.active.count > 0 ? segments.active.ltv / segments.active.count : 0,
            totalLTV: segments.active.ltv,
          },
          loyal: {
            count: segments.loyal.count,
            avgLTV: segments.loyal.count > 0 ? segments.loyal.ltv / segments.loyal.count : 0,
            totalLTV: segments.loyal.ltv,
          },
        },
      });
    } catch (error) {
      logger.error('Ошибка при расчете LTV:', error);
      throw new AppError('Не удалось рассчитать LTV', 500);
    }
  }

  // Получить топ продуктов
  async getTopProducts(_req: AuthRequest, res: Response) {
    try {
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: 'DELIVERED',
          },
        },
        _sum: {
          quantity: true,
          price: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            price: 'desc',
          },
        },
        take: 10,
      });

      // Получить детали продуктов
      const productIds = topProducts.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true,
        },
      });

      const productsMap = new Map(products.map((p) => [p.id, p]));

      const result = topProducts.map((item) => {
        const product = productsMap.get(item.productId);
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          imageUrl: product?.imageUrl || null,
          currentPrice: product?.price || 0,
          totalQuantity: item._sum.quantity || 0,
          totalRevenue: Number(item._sum.price) || 0,
          ordersCount: item._count.id,
        };
      });

      res.json({ products: result });
    } catch (error) {
      logger.error('Ошибка при получении топ продуктов:', error);
      throw new AppError('Не удалось получить топ продуктов', 500);
    }
  }

  async getOrderTimeAnalysis(_req: AuthRequest, res: Response) {
    try {
      const analysis = await getOrderTimeAnalysis();
      res.json(analysis);
    } catch (error) {
      logger.error('Ошибка при получении анализа времени заказов:', error);
      throw new AppError('Не удалось получить анализ времени заказов', 500);
    }
  }

  async getBonusAnalysis(_req: AuthRequest, res: Response) {
    try {
      const analysis = await getBonusAnalysis();
      res.json(analysis);
    } catch (error) {
      logger.error('Ошибка при получении анализа бонусов:', error);
      throw new AppError('Не удалось получить анализ бонусов', 500);
    }
  }

  async getRepeatPurchaseAnalysis(_req: AuthRequest, res: Response) {
    try {
      const analysis = await getRepeatPurchaseAnalysis();
      res.json(analysis);
    } catch (error) {
      logger.error('Ошибка при получении анализа повторных покупок:', error);
      throw new AppError('Не удалось получить анализ повторных покупок', 500);
    }
  }

  async getRFMAnalysis(_req: AuthRequest, res: Response) {
    try {
      const analysis = await getRFMAnalysis();
      res.json(analysis);
    } catch (error) {
      logger.error('Ошибка при получении RFM анализа:', error);
      throw new AppError('Не удалось получить RFM анализ', 500);
    }
  }

  // Получить статистику для рассылки
  async getBroadcastStats(req: AuthRequest, res: Response) {
    try {
      const target: BroadcastTarget = req.body;
      const stats = await getBroadcastStats(target);
      res.json(stats);
    } catch (error) {
      logger.error('Ошибка при получении статистики рассылки:', error);
      throw new AppError('Не удалось получить статистику рассылки', 500);
    }
  }

  // Отправить рассылку
  async sendBroadcast(req: AuthRequest, res: Response) {
    try {
      const { message, target }: { message: BroadcastMessage; target: BroadcastTarget } = req.body;

      if (!message || !message.text) {
        throw new AppError('Текст сообщения обязателен', 400);
      }

      if (
        !target ||
        (!target.userIds?.length &&
          !target.segment &&
          !target.audienceId &&
          !target.filters)
      ) {
        throw new AppError('Необходимо указать целевую аудиторию', 400);
      }

      // Handle 'all' segment
      if (target.segment === 'all') {
        target.segment = undefined;
      }

      const result = await sendBroadcast(message, target);
      res.json(result);
    } catch (error) {
      logger.error('Ошибка при отправке рассылки:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Не удалось отправить рассылку', 500);
    }
  }

  // Экспорт отчета по заказам
  async exportOrdersReport(req: AuthRequest, res: Response) {
    try {
      const monthParam = typeof req.query.month === 'string' ? parseInt(req.query.month, 10) : undefined;
      const yearParam = typeof req.query.year === 'string' ? parseInt(req.query.year, 10) : undefined;

      // Validate parameters
      if (!monthParam || !yearParam) {
        throw new AppError('Необходимо указать месяц и год', 400);
      }

      if (monthParam < 1 || monthParam > 12) {
        throw new AppError('Некорректный месяц. Должен быть от 1 до 12', 400);
      }

      if (yearParam < 2020 || yearParam > 2030) {
        throw new AppError('Некорректный год. Должен быть от 2020 до 2030', 400);
      }

      if (!req.user?.telegramId) {
        throw new AppError('Не удалось определить Telegram ID пользователя', 400);
      }

      // Calculate date range for the month
      const startDate = new Date(yearParam, monthParam - 1, 1);
      const endDate = new Date(yearParam, monthParam, 1);

      // Query delivered orders for the period
      const orders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          orderNumber: true,
          totalAmount: true,
          deliveryCost: true,
          adminDeliveryCost: true,
          bonusEarned: true,
          bonusUsed: true,
          promoDiscount: true,
          promoFreeDelivery: true,
          items: {
            select: {
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  buyPrice: true,
                },
              },
              selectedOptions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Prepare order items data
      const orderItems: any[] = [];
      orders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          // Формируем название товара с опциями
          let productName = item.product.name;
          if (item.selectedOptions && typeof item.selectedOptions === 'object') {
            const options = Object.entries(item.selectedOptions as Record<string, string>)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
            if (options) {
              productName += ` (${options})`;
            }
          }

          const price = Number(item.price);
          const quantity = item.quantity;
          const buyPrice = item.product.buyPrice ? Number(item.product.buyPrice) : null;

          orderItems.push({
            orderNumber: order.orderNumber,
            productName,
            price,
            quantity,
            totalPrice: price * quantity,
            buyPrice,
            totalBuyPrice: buyPrice ? buyPrice * quantity : null,
          });
        });
      });

      // Generate Excel file
      const buffer = await excelExportService.generateOrdersReport(
        orders.map((order: any) => ({
          orderNumber: order.orderNumber,
          totalAmount: Number(order.totalAmount),
          deliveryCost: Number(order.deliveryCost),
          adminDeliveryCost: order.adminDeliveryCost ? Number(order.adminDeliveryCost) : null,
          bonusEarned: order.bonusEarned,
          bonusUsed: order.bonusUsed,
          promoDiscount: Number(order.promoDiscount),
          promoFreeDelivery: order.promoFreeDelivery,
        })),
        orderItems,
        monthParam,
        yearParam
      );

      // Send file to Telegram
      const filename = `orders_report_${yearParam}_${monthParam.toString().padStart(2, '0')}.xlsx`;
      const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];
      const caption = `📊 <b>Отчет по заказам</b>\n\n📅 Период: ${monthNames[monthParam - 1]} ${yearParam}\n📦 Заказов: ${orders.length}`;

      const { sendExcelReport } = await import('../services/bot.service');
      await sendExcelReport(
        BigInt(req.user.telegramId),
        buffer,
        filename,
        caption
      );

      // Return success response
      res.json({
        success: true,
        message: 'Отчет отправлен в Telegram',
        ordersCount: orders.length,
      });

      logger.info(`Orders report exported for ${monthParam}/${yearParam} by user ${req.user?.id} and sent to Telegram`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Ошибка при экспорте отчета по заказам:', error);
      throw new AppError('Не удалось создать отчет', 500);
    }
  }
}

export default new AdminController();
