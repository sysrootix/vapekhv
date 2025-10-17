import { Request, Response } from 'express';
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
      const { categoryId, search, featured, limit = '50', offset = '0' } = req.query;

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

      const [productsData, total] = await Promise.all([
        prisma.product.findMany({
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
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
        }),
        prisma.product.count({ where }),
      ]);

      const products = productsData.map(p => {
        const inStock = p.variants.length > 0
          ? p.variants.some(v => v.stockCount > 0)
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
          category: true,
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
        ? product.variants.some(v => v.stockCount > 0)
        : product.stockCount > 0;

      res.json({ ...product, inStock });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении продукта:', error);
      throw new AppError('Не удалось получить продукт', 500);
    }
  }
}

export default new ProductController();

