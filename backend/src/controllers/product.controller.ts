import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendProductRequest } from '../services/bot.service';
import { Prisma } from '@prisma/client';

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

      // Получаем рейтинги для всех товаров одним запросом
      const productIds = productsData.map((p: any) => p.id);
      
      // Используем Prisma для получения рейтингов
      let ratingsMap = new Map<string, { rating: number; reviewCount: number }>();
      
      if (productIds.length > 0) {
        try {
          // Используем Prisma.sql для безопасного запроса
          const ratingsData = await prisma.$queryRaw<Array<{ productId: string; avgRating: number; reviewCount: bigint }>>(
            Prisma.sql`
              SELECT 
                "productId",
                AVG("rating")::float as "avgRating",
                COUNT(*)::bigint as "reviewCount"
              FROM "reviews"
              WHERE "productId" = ANY(${productIds}::text[])
              GROUP BY "productId"
            `
          );
          
          ratingsMap = new Map(
            ratingsData.map((r) => [
              r.productId,
              {
                rating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : 0,
                reviewCount: Number(r.reviewCount) || 0,
              },
            ])
          );
        } catch (error) {
          logger.error('Ошибка при получении рейтингов:', error);
          // Если ошибка - просто используем пустую мапу
        }
      }

      const products = productsData.map((p: any) => {
        const inStock = p.variants.length > 0
          ? p.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
          : p.stockCount > 0;
        
        const ratingData = ratingsMap.get(p.id) || { rating: 0, reviewCount: 0 };
        
        return { 
          ...p, 
          inStock,
          rating: ratingData.rating,
          reviewCount: ratingData.reviewCount,
        };
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

      const subscription = await prisma.stockNotification.findFirst({
        where: {
          userId,
          productId,
        },
      });

      res.json({ subscribed: !!subscription });
    } catch (error) {
      logger.error('Ошибка при проверке подписки:', error);
      throw new AppError('Не удалось проверить подписку', 500);
    }
  }

  // Отправить запрос на товар
  async requestProduct(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productRequest } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      if (!productRequest || typeof productRequest !== 'string' || productRequest.trim().length === 0) {
        throw new AppError('Укажите название товара', 400);
      }

      if (productRequest.trim().length > 500) {
        throw new AppError('Запрос слишком длинный (максимум 500 символов)', 400);
      }

      // Получаем информацию о пользователе
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          telegramId: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      });

      if (!user || !user.telegramId) {
        throw new AppError('Пользователь не найден', 404);
      }

      // Формируем имя пользователя
      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Пользователь';

      // Отправляем запрос в Telegram чат
      await sendProductRequest(
        user.telegramId,
        userName,
        productRequest.trim()
      );

      res.json({ success: true, message: 'Запрос отправлен' });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при отправке запроса на товар:', error);
      throw new AppError('Не удалось отправить запрос', 500);
    }
  }

  // Отследить просмотр товара
  async trackProductView(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      // Проверяем существование товара
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new AppError('Товар не найден', 404);
      }

      // Проверяем, есть ли уже запись просмотра
      const existingView = await prisma.productView.findFirst({
        where: {
          userId,
          productId: id,
        },
      });

      if (existingView) {
        // Обновляем время просмотра
        await prisma.productView.update({
          where: { id: existingView.id },
          data: { viewedAt: new Date() },
        });
      } else {
        // Создаем новую запись
        await prisma.productView.create({
          data: {
            userId,
            productId: id,
          },
        });
      }

      res.json({ success: true });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при отслеживании просмотра товара:', error);
      throw new AppError('Не удалось отследить просмотр', 500);
    }
  }

  // Получить похожие товары
  async getSimilarProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt((req.query.limit as string) || '8');

      // Получаем текущий товар
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          characteristics: true,
        },
      });

      if (!product) {
        throw new AppError('Товар не найден', 404);
      }

      // Ищем похожие товары по категории и характеристикам
      const where: any = {
        isActive: true,
        id: { not: id }, // Исключаем текущий товар
        OR: [
          { stockCount: { gt: 0 } },
          { variants: { some: { stockCount: { gt: 0 } } } },
        ],
      };

      // Приоритет 1: Товары из той же категории
      if (product.categoryId) {
        where.categoryId = product.categoryId;
      }

      // Находим товары из той же категории
      let similarProducts = await prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          characteristics: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
        },
        take: limit,
        orderBy: [
          { isFeatured: 'desc' }, // Сначала рекомендуемые
          { createdAt: 'desc' }, // Потом новинки
        ],
      });

      // Если не хватает товаров из той же категории, добавляем из родительской категории
      if (similarProducts.length < limit && product.category?.parentId) {
        const additionalWhere = {
          ...where,
          categoryId: product.category.parentId,
          id: { notIn: [...similarProducts.map(p => p.id), id] },
        };

        const additionalProducts = await prisma.product.findMany({
          where: additionalWhere,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            characteristics: {
              orderBy: { sortOrder: 'asc' },
            },
            variants: true,
          },
          take: limit - similarProducts.length,
          orderBy: [
            { isFeatured: 'desc' },
            { createdAt: 'desc' },
          ],
        });

        similarProducts = [...similarProducts, ...additionalProducts];
      }

      // Если все еще не хватает, добавляем любые активные товары
      if (similarProducts.length < limit) {
        const additionalWhere = {
          isActive: true,
          id: { notIn: [...similarProducts.map(p => p.id), id] },
          OR: [
            { stockCount: { gt: 0 } },
            { variants: { some: { stockCount: { gt: 0 } } } },
          ],
        };

        const additionalProducts = await prisma.product.findMany({
          where: additionalWhere,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            characteristics: {
              orderBy: { sortOrder: 'asc' },
            },
            variants: true,
          },
          take: limit - similarProducts.length,
          orderBy: [
            { isFeatured: 'desc' },
            { createdAt: 'desc' },
          ],
        });

        similarProducts = [...similarProducts, ...additionalProducts];
      }

      // Добавляем флаг inStock
      const products = similarProducts.map((p: { variants: any[]; stockCount: number; }) => {
        const inStock = p.variants.length > 0
          ? p.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
          : p.stockCount > 0;
        return { ...p, inStock };
      });

      res.json({ products });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении похожих товаров:', error);
      throw new AppError('Не удалось получить похожие товары', 500);
    }
  }

  // Получить недавно просмотренные товары
  async getRecentProducts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const limit = parseInt((req.query.limit as string) || '10');

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      // Получаем недавно просмотренные товары
      // Берем больше записей, чтобы после фильтрации осталось нужное количество
      const recentViews = await prisma.productView.findMany({
        where: {
          userId,
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              characteristics: {
                orderBy: { sortOrder: 'asc' },
              },
              variants: true,
            },
          },
        },
        orderBy: {
          viewedAt: 'desc',
        },
        take: limit * 3, // Берем в 3 раза больше, чтобы после фильтрации осталось нужное количество
      });

      // Фильтруем только активные товары с наличием
      const products = recentViews
        .map(view => view.product)
        .filter(product => {
          if (!product || !product.isActive) return false;
          const inStock = product.variants.length > 0
            ? product.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
            : product.stockCount > 0;
          return inStock;
        })
        .slice(0, limit) // Ограничиваем до limit после фильтрации
        .map((p: { variants: any[]; stockCount: number; }) => {
          const inStock = p.variants.length > 0
            ? p.variants.some((v: { stockCount: number; }) => v.stockCount > 0)
            : p.stockCount > 0;
          return { ...p, inStock };
        });

      res.json({ products });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении недавно просмотренных товаров:', error);
      throw new AppError('Не удалось получить недавно просмотренные товары', 500);
    }
  }
}

export default new ProductController();

