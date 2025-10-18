import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendPaymentNotification, sendOrderStatusNotification } from '../services/payment-notification.service';
import { syncOrderWithMoySklad } from '../services/moysklad-sync.service';


// Константы для доставки
const MIN_ORDER_AMOUNT = 1000;
const DELIVERY_TIERS = [
  { threshold: 5000, cost: 0 },
  { threshold: 4000, cost: 200 },
  { threshold: 3000, cost: 300 },
  { threshold: 1000, cost: 500 },
];

const calculateDeliveryCost = (subtotal: number): number => {
  for (const tier of DELIVERY_TIERS) {
    if (subtotal >= tier.threshold) {
      return tier.cost;
    }
  }
  return DELIVERY_TIERS[DELIVERY_TIERS.length - 1].cost;
};

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
        (sum: number, item: { product: { price: number }; quantity: number }) => sum + item.product.price * item.quantity,
        0
      );

      if (subtotal < MIN_ORDER_AMOUNT) {
        throw new AppError(`Минимальная сумма заказа ${MIN_ORDER_AMOUNT}₽`, 400);
      }

      // Рассчитать стоимость доставки
      const deliveryCost = calculateDeliveryCost(subtotal);

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

      // Установить время истечения оплаты (1 час)
      const paymentExpiresAt = new Date();
      paymentExpiresAt.setHours(paymentExpiresAt.getHours() + 1);

      // Создать заказ в транзакции
      const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            status: 'PENDING_PAYMENT',
            paymentExpiresAt,
            items: {
              create: cartItems.map((item: { productId: string; quantity: number; product: { price: number; }; selectedOptions: any; }) => ({
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

        // НЕ списываем/начисляем бонусы и НЕ уменьшаем остатки
        // Это будет сделано после подтверждения оплаты администратором

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
      const cancelled = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  // Загрузить чек оплаты
  async uploadReceipt(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: orderId } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      // Проверяем наличие файла
      const file = (req as any).file;
      if (!file) {
        throw new AppError('Файл чека не загружен', 400);
      }

      // Найти заказ
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
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

      if (order.status !== 'PENDING_PAYMENT') {
        throw new AppError('Заказ не ожидает оплаты', 400);
      }

      // Проверить, не истекло ли время оплаты
      if (order.paymentExpiresAt && new Date(order.paymentExpiresAt) < new Date()) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAYMENT_EXPIRED' },
        });
        throw new AppError('Время оплаты истекло', 400);
      }

      // Сохранить путь к файлу чека
      const receiptUrl = `/uploads/receipts/${file.filename}`;

      // Обновить заказ
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          receiptImageUrl: receiptUrl,
          status: 'PENDING', // Меняем статус на ожидание подтверждения
          paidAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      // Отправить уведомление админам в Telegram
      try {
        await sendPaymentNotification(updatedOrder);
      } catch (error) {
        logger.error('Ошибка отправки уведомления админам:', error);
        // Не бросаем ошибку, чтобы чек всё равно сохранился
      }

      logger.info(`Загружен чек для заказа ${order.orderNumber}`);

      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при загрузке чека:', error);
      throw new AppError('Не удалось загрузить чек', 500);
    }
  }

  // Подтвердить оплату (для админов)
  async confirmPayment(req: AuthRequest, res: Response) {
    try {
      const { id: orderId } = req.params;

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

      if (order.status !== 'PENDING') {
        throw new AppError('Заказ не ожидает подтверждения', 400);
      }

      // Подтвердить заказ и выполнить все операции с товарами и бонусами
      const confirmed = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Обновить статус заказа
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: true,
          },
        });

        // Списать использованные бонусы
        if (order.bonusUsed > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              bonusPoints: {
                decrement: order.bonusUsed,
              },
            },
          });

          await tx.bonusTransaction.create({
            data: {
              userId: order.userId,
              amount: -order.bonusUsed,
              type: 'SPENT',
              description: `Списано при оплате заказа ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        // НЕ начисляем бонусы здесь - это будет сделано при статусе DELIVERED

        // Уменьшить остатки товаров
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
                    decrement: item.quantity,
                  },
                  inStock: variant.stockCount - item.quantity > 0,
                },
              });
            }
          } else {
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

        return updatedOrder;
      });

      logger.info(`Заказ ${order.orderNumber} подтвержден администратором`);

      res.json(confirmed);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при подтверждении оплаты:', error);
      throw new AppError('Не удалось подтвердить оплату', 500);
    }
  }

  // Обновить статус заказа (для админов)
  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { id: orderId } = req.params;
      const { status } = req.body;

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

      // Обновить статус заказа с начислением бонусов для DELIVERED
      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Обновить статус заказа
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status },
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
                  increment: order.totalAmount - order.deliveryCost,
                },
              },
            });

            await tx.bonusTransaction.create({
              data: {
                userId: order.userId,
                amount: order.bonusEarned,
                type: 'EARNED',
                description: `Начислено за доставленный заказ ${order.orderNumber}`,
                orderId: order.id,
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

  // Подтвердить получение заказа клиентом
  async confirmDelivery(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: orderId } = req.params;

      if (!userId) {
        throw new AppError('Пользователь не авторизован', 401);
      }

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId, // Проверяем, что заказ принадлежит этому пользователю
        },
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

      if (order.status !== 'SHIPPED') {
        throw new AppError('Заказ не находится в статусе "Передали курьеру"', 400);
      }

      // Обновить статус на DELIVERED с начислением бонусов
      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Обновить статус заказа
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'DELIVERED' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: true,
          },
        });

        // Начислить бонусы ТОЛЬКО если они еще не начислены
        if (order.bonusEarned > 0) {
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
                  increment: order.totalAmount - order.deliveryCost,
                },
              },
            });

            await tx.bonusTransaction.create({
              data: {
                userId: order.userId,
                amount: order.bonusEarned,
                type: 'EARNED',
                description: `Начислено за доставленный заказ ${order.orderNumber}`,
                orderId: order.id,
              },
            });
          }
        }

        return updatedOrder;
      });

      // Синхронизировать с МойСклад
      try {
        await syncOrderWithMoySklad(updated);
      } catch (moyskladError) {
        logger.error('Ошибка при синхронизации заказа в МойСклад:', moyskladError);
        // Не выбрасываем ошибку, чтобы основной процесс не прерывался
      }

      // Отправить уведомление пользователю об изменении статуса
      try {
        await sendOrderStatusNotification(updated, 'DELIVERED');
      } catch (error) {
        logger.error('Ошибка отправки уведомления пользователю:', error);
      }

      logger.info(`Клиент подтвердил доставку заказа ${order.orderNumber}`);

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Ошибка при подтверждении доставки:', error);
      throw new AppError('Не удалось подтвердить доставку', 500);
    }
  }
}

export default new OrderController();
