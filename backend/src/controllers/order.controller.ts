import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

// Константы для доставки
const DELIVERY_COST = 500;
const FREE_DELIVERY_THRESHOLD = 2500;

class OrderController {
  // Получить все заказы пользователя
  async getOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const orders = await prisma.order.findMany({
        where: { userId },
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

      res.json(orders);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении заказов:', error);
      throw new AppError('Не удалось получить заказы', 500);
    }
  }

  // Получить конкретный заказ
  async getOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const order = await prisma.order.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError('Заказ не найден', 404);
      }

      res.json(order);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при получении заказа:', error);
      throw new AppError('Не удалось получить заказ', 500);
    }
  }

  // Создать заказ
  async createOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        phone,
        deliveryAddress,
        deliveryDate,
        deliveryTime,
        comment,
        bonusToUse = 0,
      } = req.body;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      // Валидация
      if (!phone) {
        throw new AppError('Укажите номер телефона', 400);
      }

      if (!deliveryAddress) {
        throw new AppError('Укажите адрес доставки', 400);
      }

      if (!deliveryDate) {
        throw new AppError('Укажите дату доставки', 400);
      }

      if (!deliveryTime) {
        throw new AppError('Укажите время доставки', 400);
      }

      // Получить корзину пользователя
      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: true,
        },
      });

      if (cartItems.length === 0) {
        throw new AppError('Корзина пуста', 400);
      }

      // Проверить остатки всех товаров
      for (const item of cartItems) {
        const product = item.product;

        // Если есть выбранные опции - проверяем вариант
        if (item.selectedOptions && typeof item.selectedOptions === 'object') {
          const variant = await prisma.productVariant.findFirst({
            where: {
              productId: product.id,
              characteristics: { equals: item.selectedOptions },
            },
          });

          if (!variant || !variant.inStock || variant.stockCount < item.quantity) {
            throw new AppError(
              `Товар "${product.name}" недоступен в выбранной конфигурации`,
              400
            );
          }
        } else {
          // Проверяем основной продукт
          if (!product.inStock || product.stockCount < item.quantity) {
            throw new AppError(`Товар "${product.name}" недоступен`, 400);
          }
        }
      }

      // Рассчитать сумму заказа
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      // Рассчитать стоимость доставки
      const deliveryCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;

      // Получить пользователя для проверки бонусов
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('Пользователь не найден', 404);
      }

      // Проверить доступность бонусов
      if (bonusToUse > user.bonusPoints) {
        throw new AppError('Недостаточно бонусов', 400);
      }

      // Общая сумма заказа
      const totalAmount = subtotal + deliveryCost - bonusToUse;

      if (totalAmount < 0) {
        throw new AppError('Сумма заказа не может быть отрицательной', 400);
      }

      // Генерация номера заказа
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Рассчитать бонусы к начислению (5% от суммы товаров без учета доставки)
      const bonusEarned = Math.floor(subtotal * 0.05);

      // Создать заказ в транзакции
      const order = await prisma.$transaction(async (tx) => {
        // Создать заказ
        const newOrder = await tx.order.create({
          data: {
            userId,
            orderNumber,
            totalAmount,
            deliveryCost,
            bonusUsed: bonusToUse,
            bonusEarned,
            deliveryAddress,
            deliveryPhone: phone,
            deliveryDate,
            deliveryTime,
            comment: comment || null,
            status: 'PENDING',
            items: {
              create: cartItems.map((item) => ({
                product: {
                  connect: { id: item.productId },
                },
                quantity: item.quantity,
                price: item.product.price,
                selectedOptions: item.selectedOptions || undefined,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Списать использованные бонусы
        if (bonusToUse > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              bonusPoints: {
                decrement: bonusToUse,
              },
            },
          });

          // Создать транзакцию списания бонусов
          await tx.bonusTransaction.create({
            data: {
              userId,
              amount: -bonusToUse,
              type: 'SPENT',
              description: `Списано при оплате заказа ${orderNumber}`,
              orderId: newOrder.id,
            },
          });
        }

        // Начислить бонусы за покупку
        if (bonusEarned > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              bonusPoints: {
                increment: bonusEarned,
              },
              totalSpent: {
                increment: subtotal,
              },
            },
          });

          // Создать транзакцию начисления бонусов
          await tx.bonusTransaction.create({
            data: {
              userId,
              amount: bonusEarned,
              type: 'EARNED',
              description: `Начислено за заказ ${orderNumber}`,
              orderId: newOrder.id,
            },
          });
        } else {
          // Обновить только totalSpent
          await tx.user.update({
            where: { id: userId },
            data: {
              totalSpent: {
                increment: subtotal,
              },
            },
          });
        }

        // Уменьшить остатки товаров
        for (const item of cartItems) {
          if (item.selectedOptions && typeof item.selectedOptions === 'object') {
            // Обновляем вариант
            const variant = await tx.productVariant.findFirst({
              where: {
                productId: item.productId,
                characteristics: { equals: item.selectedOptions },
              },
            });

            if (variant) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  stockCount: {
                    decrement: item.quantity,
                  },
                  inStock: variant.stockCount - item.quantity > 0,
                },
              });
            }
          } else {
            // Обновляем основной продукт
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockCount: {
                  decrement: item.quantity,
                },
                inStock: item.product.stockCount - item.quantity > 0,
              },
            });
          }
        }

        // Очистить корзину
        await tx.cartItem.deleteMany({
          where: { userId },
        });

        return newOrder;
      });

      logger.info(`Создан заказ ${orderNumber} для пользователя ${userId}`);

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при создании заказа:', error);
      throw new AppError('Не удалось создать заказ', 500);
    }
  }

  // Отменить заказ
  async cancelOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const order = await prisma.order.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new AppError('Заказ не найден', 404);
      }

      if (order.status === 'CANCELLED') {
        throw new AppError('Заказ уже отменен', 400);
      }

      if (['DELIVERED', 'SHIPPED'].includes(order.status)) {
        throw new AppError('Невозможно отменить доставленный или отправленный заказ', 400);
      }

      // Отменить заказ в транзакции
      const cancelled = await prisma.$transaction(async (tx) => {
        // Обновить статус заказа
        const updatedOrder = await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Вернуть бонусы, если они были использованы
        if (order.bonusUsed > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              bonusPoints: {
                increment: order.bonusUsed,
              },
            },
          });

          await tx.bonusTransaction.create({
            data: {
              userId,
              amount: order.bonusUsed,
              type: 'REFUND',
              description: `Возврат бонусов за отмену заказа ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        // Списать начисленные бонусы
        if (order.bonusEarned > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              bonusPoints: {
                decrement: order.bonusEarned,
              },
            },
          });

          await tx.bonusTransaction.create({
            data: {
              userId,
              amount: -order.bonusEarned,
              type: 'REFUND',
              description: `Списание начисленных бонусов за отмену заказа ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        // Вернуть товары на склад
        for (const item of order.items) {
          if (item.selectedOptions && typeof item.selectedOptions === 'object') {
            const variant = await tx.productVariant.findFirst({
              where: {
                productId: item.productId,
                characteristics: { equals: item.selectedOptions },
              },
            });

            if (variant) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  stockCount: {
                    increment: item.quantity,
                  },
                  inStock: true,
                },
              });
            }
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockCount: {
                  increment: item.quantity,
                },
                inStock: true,
              },
            });
          }
        }

        return updatedOrder;
      });

      logger.info(`Заказ ${order.orderNumber} отменен пользователем ${userId}`);

      res.json(cancelled);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при отмене заказа:', error);
      throw new AppError('Не удалось отменить заказ', 500);
    }
  }
}

export default new OrderController();
