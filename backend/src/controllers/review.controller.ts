import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { bonusService } from '../services/bonus.service';

class ReviewController {
  // Создать отзыв
  async createReview(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId, orderId, rating, text, images, videos } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      if (!productId || !rating) {
        throw new AppError('Укажите товар и оценку', 400);
      }

      if (rating < 1 || rating > 5) {
        throw new AppError('Оценка должна быть от 1 до 5', 400);
      }

      // Проверяем, что товар существует
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError('Товар не найден', 404);
      }

      // Если указан orderId, проверяем что заказ принадлежит пользователю и содержит этот товар
      if (orderId) {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            userId,
            status: 'DELIVERED',
          },
          include: {
            items: true,
          },
        });

        if (!order) {
          throw new AppError('Заказ не найден или не доставлен', 404);
        }

        const hasProduct = order.items.some((item) => item.productId === productId);
        if (!hasProduct) {
          throw new AppError('Товар не найден в заказе', 400);
        }
      }

      // Проверяем, не оставлял ли пользователь уже отзыв на этот товар
      const existingReview = await prisma.review.findFirst({
        where: {
          userId,
          productId,
          ...(orderId ? { orderId } : {}),
        },
      });

      if (existingReview) {
        throw new AppError('Вы уже оставили отзыв на этот товар', 400);
      }

      // Создаем отзыв
      const review = await prisma.review.create({
        data: {
          userId,
          productId,
          orderId: orderId || null,
          rating,
          text: text?.trim() || null,
          images: images || [],
          videos: videos || [],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              photoUrl: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Начисляем бонусы за отзыв (50 баллов)
      const bonusAmount = 50;
      try {
        await bonusService.addBonus(userId, bonusAmount, 'GIFT', `Отзыв на товар "${product.name}"`);
        
        await prisma.review.update({
          where: { id: review.id },
          data: { bonusAwarded: bonusAmount },
        });
      } catch (error) {
        logger.error('Ошибка при начислении бонусов за отзыв:', error);
      }

      res.json({
        ...review,
        bonusAwarded: bonusAmount,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при создании отзыва:', error);
      throw new AppError('Не удалось создать отзыв', 500);
    }
  }

  // Получить отзывы товара
  async getProductReviews(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { limit = '20', offset = '0' } = req.query;

      const reviews = await prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.review.count({ where: { productId } });

      res.json({
        reviews,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error) {
      logger.error('Ошибка при получении отзывов:', error);
      throw new AppError('Не удалось получить отзывы', 500);
    }
  }

  // Получить рейтинг товара
  async getProductRating(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      const result = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const rating = result._avg.rating || 0;
      const reviewCount = result._count.rating || 0;

      const ratingDistribution = await prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      });

      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDistribution.forEach((item) => {
        distribution[item.rating as keyof typeof distribution] = item._count.rating;
      });

      res.json({
        rating: Math.round(rating * 10) / 10,
        reviewCount,
        distribution,
      });
    } catch (error) {
      logger.error('Ошибка при получении рейтинга:', error);
      throw new AppError('Не удалось получить рейтинг', 500);
    }
  }

  // Получить товары, на которые можно оставить отзыв
  async getPendingReviews(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const deliveredOrders = await prisma.order.findMany({
        where: {
          userId,
          status: 'DELIVERED',
        },
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
        },
        orderBy: { createdAt: 'desc' },
      });

      const userReviews = await prisma.review.findMany({
        where: { userId },
        select: { productId: true, orderId: true },
      });

      const reviewedProducts = new Set(
        userReviews.map((r) => `${r.productId}-${r.orderId || 'no-order'}`)
      );

      const pendingReviews: Array<{
        productId: string;
        productName: string;
        productImageUrl: string | null;
        productPrice: number;
        orderId: string;
        orderNumber: string;
        orderDate: Date;
      }> = [];

      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const key = `${item.productId}-${order.id}`;
          if (!reviewedProducts.has(key)) {
            pendingReviews.push({
              productId: item.productId,
              productName: item.product.name,
              productImageUrl: item.product.imageUrl,
              productPrice: item.product.price,
              orderId: order.id,
              orderNumber: order.orderNumber,
              orderDate: order.createdAt,
            });
          }
        });
      });

      const uniqueProducts = new Map<string, typeof pendingReviews[0]>();
      pendingReviews.forEach((item) => {
        const key = `${item.productId}-${item.orderId}`;
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, item);
        }
      });

      res.json({
        products: Array.from(uniqueProducts.values()).slice(0, 10),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении товаров для отзывов:', error);
      throw new AppError('Не удалось получить товары для отзывов', 500);
    }
  }

  // Получить случайные отзывы для главной страницы
  async getRandomReviews(req: Request, res: Response) {
    try {
      const { limit = '3' } = req.query;

      const reviews = await prisma.review.findMany({
        take: parseInt(limit as string) * 2,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              photoUrl: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const shuffled = reviews.sort(() => Math.random() - 0.5);

      res.json({
        reviews: shuffled.slice(0, parseInt(limit as string)),
      });
    } catch (error) {
      logger.error('Ошибка при получении случайных отзывов:', error);
      throw new AppError('Не удалось получить отзывы', 500);
    }
  }

  // Получить все отзывы (для страницы со всеми отзывами)
  async getAllReviews(req: Request, res: Response) {
    try {
      const { limit = '20', offset = '0' } = req.query;

      const reviews = await prisma.review.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              photoUrl: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.review.count();

      res.json({
        reviews,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error) {
      logger.error('Ошибка при получении всех отзывов:', error);
      throw new AppError('Не удалось получить отзывы', 500);
    }
  }
}

export default new ReviewController();
