import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

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
      const { status, deliveryCost } = req.body;

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

      // Если передается стоимость доставки, сохраняем её
      if (deliveryCost !== undefined && deliveryCost !== null) {
        await prisma.order.update({
          where: { id: orderId },
          data: { deliveryCost: parseFloat(deliveryCost.toString()) },
        });
      }

      // Используем существующий метод из order.controller для обновления статуса
      // Это гарантирует единообразную логику начисления бонусов и уведомлений
      const OrderController = (await import('./order.controller')).default;

      // Вызываем метод напрямую
      req.params.id = orderId;
      req.body.status = status;

      return OrderController.updateOrderStatus(req, res);
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
