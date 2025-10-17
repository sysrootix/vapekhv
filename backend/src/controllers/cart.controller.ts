import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

class CartController {
  // Получить корзину пользователя
  async getCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              characteristics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      res.json({
        items: cartItems,
        total,
        count: cartItems.length,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении корзины:', error);
      throw new AppError('Не удалось получить корзину', 500);
    }
  }

  // Добавить товар в корзину
  async addToCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId, quantity = 1, selectedOptions } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      if (!productId) {
        throw new AppError('Не указан ID продукта', 400);
      }

      // Проверить существование продукта
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          characteristics: true,
        },
      });

      if (!product || !product.isActive) {
        throw new AppError('Продукт не найден', 404);
      }

      // Если есть опции - ищем вариант и проверяем его наличие
      if (selectedOptions && Object.keys(selectedOptions).length > 0) {
        const variant = await prisma.productVariant.findFirst({
          where: {
            productId: product.id,
            characteristics: selectedOptions,
          }
        });

        if (!variant) {
          throw new AppError('Выбранный вариант не найден', 404);
        }

        if (!variant.inStock || variant.stockCount < quantity) {
          throw new AppError('Выбранный вариант отсутствует в наличии', 400);
        }
      } else { // Иначе проверяем наличие основного продукта
        if (!product.inStock || product.stockCount < quantity) {
          throw new AppError('Продукт отсутствует в наличии', 400);
        }
      }

      // Проверить обязательные характеристики
      if (product.characteristics && product.characteristics.length > 0) {
        const requiredCharacteristics = product.characteristics.filter(c => c.required);
        for (const char of requiredCharacteristics) {
          if (!selectedOptions || !selectedOptions[char.name]) {
            throw new AppError(`Необходимо выбрать: ${char.name}`, 400);
          }
        }
      }

      // Проверить наличие такого же товара с такими же характеристиками
      const existingItems = await prisma.cartItem.findMany({
        where: { userId, productId },
      });

      const existingItem = existingItems.find(item => {
        if (!item.selectedOptions && !selectedOptions) return true;
        if (!item.selectedOptions || !selectedOptions) return false;
        return JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions);
      });

      let cartItem;

      if (existingItem) {
        // Обновить количество
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
          },
          include: {
            product: true,
          },
        });
      } else {
        // Создать новый элемент
        cartItem = await prisma.cartItem.create({
          data: {
            userId,
            productId,
            quantity,
            selectedOptions: selectedOptions || null,
          },
          include: {
            product: true,
          },
        });
      }

      res.json(cartItem);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при добавлении в корзину:', error);
      throw new AppError('Не удалось добавить товар в корзину', 500);
    }
  }

  // Обновить количество товара
  async updateCartItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      if (quantity < 1) {
        throw new AppError('Количество должно быть больше 0', 400);
      }

      const cartItem = await prisma.cartItem.findFirst({
        where: { id, userId },
      });

      if (!cartItem) {
        throw new AppError('Элемент корзины не найден', 404);
      }

      const updated = await prisma.cartItem.update({
        where: { id },
        data: { quantity },
        include: {
          product: true,
        },
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при обновлении корзины:', error);
      throw new AppError('Не удалось обновить корзину', 500);
    }
  }

  // Удалить товар из корзины
  async removeFromCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const cartItem = await prisma.cartItem.findFirst({
        where: { id, userId },
      });

      if (!cartItem) {
        throw new AppError('Элемент корзины не найден', 404);
      }

      await prisma.cartItem.delete({
        where: { id },
      });

      res.json({ message: 'Товар удален из корзины' });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при удалении из корзины:', error);
      throw new AppError('Не удалось удалить товар из корзины', 500);
    }
  }

  // Очистить корзину
  async clearCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      await prisma.cartItem.deleteMany({
        where: { userId },
      });

      res.json({ message: 'Корзина очищена' });
    } catch (error) {
      logger.error('Ошибка при очистке корзины:', error);
      throw new AppError('Не удалось очистить корзину', 500);
    }
  }
}

export default new CartController();

