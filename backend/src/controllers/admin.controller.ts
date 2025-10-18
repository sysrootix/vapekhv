import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendOrderStatusNotification } from '../services/payment-notification.service';

// Получить список админов из переменных окружения
const getAdminChatIds = (): number[] => {
  const adminIds = process.env.ADMIN_CHAT_IDS || '';
  return adminIds
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));
};

// Middleware для проверки прав администратора
export const requireAdmin = async (req: AuthRequest, _res: Response, next: Function) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    // Получить пользователя с telegramId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true }
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    const adminChatIds = getAdminChatIds();
    const telegramId = Number(user.telegramId);

    if (!adminChatIds.includes(telegramId)) {
      throw new AppError('Доступ запрещен. Требуются права администратора', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

class AdminController {
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

      const updated = await prisma.$transaction(async (tx) => {
        const updateData: Prisma.OrderUpdateInput = { status };

        const costToSave = adminDeliveryCost ?? deliveryCost;
        if (costToSave !== undefined && costToSave !== null) {
          updateData.adminDeliveryCost = parseFloat(costToSave.toString());
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
}

export default new AdminController();
