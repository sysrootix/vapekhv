import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { sendPaymentNotification, sendOrderStatusNotification } from '../services/payment-notification.service';
import { moySkladConfig } from '../config/moysklad';
import { moySkladAPI } from '../services/moysklad.api';
import {
  MoySkladCashIn,
  MoySkladCounterparty,
  MoySkladCustomerOrder,
  MoySkladCustomerOrderPosition,
  MoySkladDemand,
  MoySkladDemandPosition,
  MoySkladMeta,
} from '../types/moysklad.types';


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
        (sum: number, item: { product: { price: number }; quantity: number }) => sum + item.product.price * item.quantity,
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

      // Создать документы в МойСклад
      try {
        const hasMoySkladConfig =
          Boolean(moySkladConfig.token) &&
          Boolean(moySkladConfig.organizationId) &&
          Boolean(moySkladConfig.storeId);

        if (!hasMoySkladConfig) {
          logger.warn('Интеграция с МойСклад пропущена: конфигурация неполная');
        } else {
          const buildMeta = (type: string, id: string): MoySkladMeta => ({
            href: `${moySkladConfig.apiUrl}/entity/${type}/${id}`,
            type,
            mediaType: 'application/json',
          });

          const organizationRef = { meta: buildMeta('organization', moySkladConfig.organizationId) };
          const storeRef = { meta: buildMeta('store', moySkladConfig.storeId) };
          const orderTotalCoins = Math.round(confirmed.totalAmount * 100);

          const preferredPhone = confirmed.deliveryPhone || order.user.phone || undefined;
          const counterpartyName =
            [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
            order.user.username ||
            (preferredPhone ? `Покупатель ${preferredPhone}` : `Покупатель ${order.userId}`);

          let counterparty: MoySkladCounterparty | null =
            await moySkladAPI.findCounterpartyByPhone(preferredPhone);

          if (!counterparty) {
            counterparty = await moySkladAPI.createCounterparty({
              name: counterpartyName,
              phone: preferredPhone,
              externalCode: order.user.telegramId
                ? `tg-${order.user.telegramId}`
                : `user-${order.userId}`,
              companyType: 'individual',
              actualAddress: confirmed.deliveryAddress || undefined,
            });
          }

          if (!counterparty?.meta?.href) {
            throw new Error('Контрагент не содержит meta.href, невозможно создать заказ в МойСклад');
          }

          const agentReference = { meta: counterparty.meta };

          const preparedItems = (
            await Promise.all(
              confirmed.items.map(async (item) => {
                const price = Math.round(item.price * 100);
                let assortmentMeta: MoySkladMeta | null = null;

                if (item.selectedOptions && typeof item.selectedOptions === 'object') {
                  const variant = await prisma.productVariant.findFirst({
                    where: {
                      productId: item.productId,
                      characteristics: {
                        equals: item.selectedOptions as Prisma.JsonValue,
                      },
                    },
                    select: {
                      moySkladId: true,
                    },
                  });

                  if (variant?.moySkladId) {
                    assortmentMeta = buildMeta('variant', variant.moySkladId);
                  }
                }

                if (!assortmentMeta) {
                  const productMoySkladId = item.product.moySkladId;
                  if (productMoySkladId) {
                    assortmentMeta = buildMeta('product', productMoySkladId);
                  }
                }

                if (!assortmentMeta) {
                  logger.warn(
                    `Позиция "${item.product.name}" пропущена при создании заказа ${confirmed.orderNumber} в МойСклад: отсутствует moySkladId`
                  );
                  return null;
                }

                return {
                  quantity: item.quantity,
                  price,
                  assortmentMeta,
                };
              })
            )
          ).filter(
            (
              position
            ): position is { quantity: number; price: number; assortmentMeta: MoySkladMeta } =>
              position !== null
          );

          if (preparedItems.length === 0) {
            throw new Error(
              `Не удалось подготовить позиции заказа ${confirmed.orderNumber} для отправки в МойСклад`
            );
          }

          const customerOrderPositions: MoySkladCustomerOrderPosition[] = preparedItems.map(
            (position) => ({
              quantity: position.quantity,
              price: position.price,
              assortment: { meta: position.assortmentMeta },
            })
          );

          const deliveryTimeValue = confirmed.deliveryTime || undefined;
          let deliveryMoment: string | undefined;
          if (confirmed.deliveryDate) {
            if (deliveryTimeValue) {
              const normalizedTime =
                deliveryTimeValue.length === 5 ? `${deliveryTimeValue}:00` : deliveryTimeValue;
              deliveryMoment = new Date(`${confirmed.deliveryDate}T${normalizedTime}`).toISOString();
            } else {
              deliveryMoment = new Date(confirmed.deliveryDate).toISOString();
            }
          }

          const moyskladOrderPayload: MoySkladCustomerOrder = {
            name: confirmed.orderNumber,
            moment: new Date().toISOString(),
            organization: organizationRef,
            agent: {
              meta: agentReference.meta,
              name: counterparty.name || counterpartyName,
              phone: counterparty.phone || preferredPhone,
            },
            store: storeRef,
            sum: orderTotalCoins,
            description: `Заказ из Telegram WebApp. Адрес: ${confirmed.deliveryAddress || '—'}. Время доставки: ${confirmed.deliveryDate || '—'} ${confirmed.deliveryTime || ''}. Комментарий: ${confirmed.comment || '—'}. Стоимость доставки (админ): ${confirmed.adminDeliveryCost ?? 'не указана'}`,
            positions: customerOrderPositions,
            deliveryPlannedMoment: deliveryMoment,
            applicable: true,
            shipmentAddress: confirmed.deliveryAddress || undefined,
          };

          const moyskladOrder = await moySkladAPI.createCustomerOrder(moyskladOrderPayload);

          let demand: MoySkladDemand | null = null;
          try {
            const demandPositions: MoySkladDemandPosition[] = preparedItems.map((position) => ({
              quantity: position.quantity,
              price: position.price,
              assortment: { meta: position.assortmentMeta },
            }));

            const demandPayload: MoySkladDemand = {
              name: `${confirmed.orderNumber}-отгрузка`,
              moment: new Date().toISOString(),
              organization: organizationRef,
              agent: agentReference,
              store: storeRef,
              applicable: true,
              customerOrder: moyskladOrder.meta ? { meta: moyskladOrder.meta } : undefined,
              description: `Отгрузка по заказу ${confirmed.orderNumber}`,
              positions: demandPositions,
            };

            demand = await moySkladAPI.createDemand(demandPayload);
          } catch (demandError) {
            logger.error('Ошибка при создании отгрузки в МойСклад:', demandError);
          }

          try {
            const operations =
              moyskladOrder.meta || demand?.meta
                ? [
                    ...(moyskladOrder.meta
                      ? [{ meta: moyskladOrder.meta, linkedSum: orderTotalCoins }]
                      : []),
                    ...(demand?.meta ? [{ meta: demand.meta, linkedSum: orderTotalCoins }] : []),
                  ]
                : undefined;

            const cashInPayload: MoySkladCashIn = {
              name: `${confirmed.orderNumber}-оплата`,
              moment: new Date().toISOString(),
              organization: organizationRef,
              agent: agentReference,
              sum: orderTotalCoins,
              description: `Оплата наличными за заказ ${confirmed.orderNumber}`,
              operations,
            };

            await moySkladAPI.createCashIn(cashInPayload);
          } catch (cashInError) {
            logger.error('Ошибка при создании кассового ордера в МойСклад:', cashInError);
          }

          logger.info(`Заказ ${confirmed.orderNumber} синхронизирован с МойСклад`);
        }
      } catch (moyskladError) {
        logger.error('Ошибка при синхронизации заказа в МойСклад:', moyskladError);
        // Не выбрасываем ошибку, чтобы основной процесс подтверждения заказа не прерывался
      }

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
