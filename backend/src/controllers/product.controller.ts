import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

class ProductController {
  // Получить все категории
  async getCategories(_req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        where: {
          isActive: true,
          products: {
            some: {
              isActive: true,
              OR: [
                { stockCount: { gt: 0 } },
                { variants: { some: { stockCount: { gt: 0 } } } },
              ],
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      res.json(categories);
    } catch (error) {
      logger.error('Ошибка при получении категорий:', error);
      throw new AppError('Не удалось получить категории', 500);
    }
  }

  // Получить все продукты с фильтрацией
  async getProducts(req: Request, res: Response) {
    try {
      const {
        categoryId,
        search,
        featured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        minPrice,
        maxPrice,
        limit = '50',
        offset = '0'
      } = req.query;

      const where: any = {
        isActive: true,
        OR: [
          { stockCount: { gt: 0 } },
          { variants: { some: { stockCount: { gt: 0 } } } },
        ],
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (featured === 'true') {
        where.isFeatured = true;
      }

      // Фильтр по цене
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) {
          where.price.gte = parseFloat(minPrice as string);
        }
        if (maxPrice) {
          where.price.lte = parseFloat(maxPrice as string);
        }
      }

      // Определяем сортировку
      let orderByClause: any = { createdAt: 'desc' };
      if (sortBy === 'price') {
        orderByClause = { price: sortOrder };
      } else if (sortBy === 'name') {
        orderByClause = { name: sortOrder };
      } else if (sortBy === 'createdAt') {
        orderByClause = { createdAt: sortOrder };
      }
      // Для popularity можно использовать viewCount или orderCount, если они есть
      // Пока оставим createdAt для новинок

      const [productsData, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
            characteristics: {
              orderBy: { sortOrder: 'asc' },
            },
            variants: true,
          },
          orderBy: orderByClause,
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
        }),
        prisma.product.count({ where }),
      ]);

      const products = productsData.map((p: { variants: any[]; stockCount: number; }) => {
        const inStock = p.variants.length > 0
          ? p.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
          : p.stockCount > 0;
        return { ...p, inStock };
      });

      res.json({
        products,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error) {
      logger.error('Ошибка при получении продуктов:', error);
      throw new AppError('Не удалось получить продукты', 500);
    }
  }

  // Получить один продукт по ID или slug
  async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id },
            { slug: id },
          ],
          isActive: true,
        },
        include: {
          category: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
          characteristics: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
        },
      });

      if (!product) {
        throw new AppError('Продукт не найден', 404);
      }

      const inStock = product.variants.length > 0
        ? product.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
        : product.stockCount > 0;

      res.json({ ...product, inStock });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении продукта:', error);
      throw new AppError('Не удалось получить продукт', 500);
    }
  }

  // Подписаться на уведомление о наличии
  async subscribeToStockNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      // Проверяем существование продукта
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError('Товар не найден', 404);
      }

      // Если товар в наличии - не даем подписаться
      if (product.inStock && product.stockCount > 0) {
        throw new AppError('Товар уже в наличии', 400);
      }

      // Создаем или обновляем подписку
      const notification = await prisma.stockNotification.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        create: {
          userId,
          productId,
        },
        update: {
          notified: false, // Сбрасываем флаг, если подписываемся повторно
        },
      });

      logger.info(`Пользователь ${userId} подписался на уведомление о товаре ${productId}`);
      res.json({ message: 'Вы подписаны на уведомление о поступлении', notification });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при подписке на уведомление:', error);
      throw new AppError('Не удалось подписаться на уведомление', 500);
    }
  }

  // Отписаться от уведомления о наличии
  async unsubscribeFromStockNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      await prisma.stockNotification.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      logger.info(`Пользователь ${userId} отписался от уведомления о товаре ${productId}`);
      res.json({ message: 'Вы отписались от уведомления' });
    } catch (error) {
      logger.error('Ошибка при отписке от уведомления:', error);
      throw new AppError('Не удалось отписаться от уведомления', 500);
    }
  }

  // Проверить подписку на уведомление
  async checkStockNotificationSubscription(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const subscription = await prisma.stockNotification.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      res.json({ subscribed: !!subscription });
    } catch (error) {
      logger.error('Ошибка при проверке подписки:', error);
      throw new AppError('Не удалось проверить подписку', 500);
    }
  }
}

export default new ProductController();

