import bot from './bot.service';
import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { OrderStatus } from '@prisma/client';

const ADMIN_GROUP_ID = process.env.TELEGRAM_ADMIN_GROUP_ID!;
const WEBAPP_URL = process.env.WEBAPP_URL;

// Инициализация обработчика платежных уведомлений
export const initPaymentBot = () => {
  if (!ADMIN_GROUP_ID) {
    logger.warn('⚠️ TELEGRAM_ADMIN_GROUP_ID не настроен, платежные уведомления отключены');
    return;
  }

  try {
    // Регистрируем обработчик callback кнопок для платежей
    bot.on('callback_query', async (query) => {
      // Проверяем что это callback от платежной системы
      if (query.data && (query.data.startsWith('approve:') || query.data.startsWith('cancel:'))) {
        try {
          await handleAdminAction(query);
        } catch (error) {
          logger.error('Ошибка обработки callback от админа:', error);
        }
      }
    });

    logger.info('✅ Payment notification handlers инициализированы');
  } catch (error) {
    logger.error('Ошибка инициализации payment handlers:', error);
  }
};

// Обработчик действий админа
const handleAdminAction = async (query: TelegramBot.CallbackQuery) => {
  if (!bot || !query.data) return;

  const [action, orderId] = query.data.split(':');

  try {
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
      await bot.answerCallbackQuery(query.id, {
        text: '❌ Заказ не найден',
        show_alert: true,
      });
      return;
    }

    if (action === 'approve') {
      // Подтвердить оплату
      if (order.status !== OrderStatus.PENDING) {
        await bot.answerCallbackQuery(query.id, {
          text: '⚠️ Заказ уже обработан',
          show_alert: true,
        });
        return;
      }

      // Выполняем подтверждение
      await prisma.$transaction(async (tx) => {
        // Обновить статус заказа
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CONFIRMED },
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

        // Начислить бонусы за покупку
        if (order.bonusEarned > 0) {
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
              description: `Начислено за заказ ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }

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
      });

      // Обновить сообщение в группе
      if (query.message) {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          }
        );

        await bot.editMessageText(
          `${query.message.text}\n\n✅ <b>ОДОБРЕНО</b> администратором @${query.from?.username || 'Unknown'}`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
          }
        );
      }

      await bot.answerCallbackQuery(query.id, {
        text: '✅ Заказ подтвержден!',
      });

      logger.info(`✅ Заказ ${order.orderNumber} подтвержден админом @${query.from?.username}`);

    } else if (action === 'cancel') {
      // Отменить заказ
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PAYMENT_EXPIRED) {
        await bot.answerCallbackQuery(query.id, {
          text: '⚠️ Заказ уже отменён',
          show_alert: true,
        });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // Обновить сообщение в группе
      if (query.message) {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          }
        );

        await bot.editMessageText(
          `${query.message.text}\n\n❌ <b>ОТМЕНЕНО</b> администратором @${query.from?.username || 'Unknown'}`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
          }
        );
      }

      await bot.answerCallbackQuery(query.id, {
        text: '❌ Заказ отменён!',
      });

      logger.info(`❌ Заказ ${order.orderNumber} отменён админом @${query.from?.username}`);
    }
  } catch (error) {
    logger.error('Ошибка при обработке действия админа:', error);
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Произошла ошибка',
      show_alert: true,
    });
  }
};

// Отправить уведомление админам о новом чеке
export const sendPaymentNotification = async (order: any) => {
  if (!bot || !ADMIN_GROUP_ID) {
    logger.warn('Telegram bot не инициализирован, уведомление не отправлено');
    return;
  }

  try {
    const items = order.items
      .map((item: any) => {
        const options = item.selectedOptions
          ? Object.entries(item.selectedOptions)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')
          : '';
        return `  • ${item.product.name} × ${item.quantity} - ${(item.price * item.quantity).toLocaleString()}₽${options ? `\n    (${options})` : ''}`;
      })
      .join('\n');

    const message = `
🔔 <b>НОВАЯ ОПЛАТА</b>

📦 Заказ: <b>#${order.orderNumber}</b>
👤 Клиент: ${order.user.firstName || ''} ${order.user.lastName || ''}
   @${order.user.username || 'без username'}
   ID: <code>${order.user.telegramId}</code>

💰 Сумма: <b>${order.totalAmount.toLocaleString()}₽</b>
${order.bonusUsed > 0 ? `🎁 Использовано бонусов: ${order.bonusUsed}\n` : ''}
${order.bonusEarned > 0 ? `⭐️ К начислению: ${order.bonusEarned}\n` : ''}

📍 Адрес: ${order.deliveryAddress || 'Не указан'}
📞 Телефон: ${order.deliveryPhone || 'Не указан'}
📅 Дата доставки: ${order.deliveryDate || 'Не указана'} ${order.deliveryTime || ''}
${order.comment ? `💬 Комментарий: ${order.comment}\n` : ''}

🛒 Товары:
${items}

⏰ Создан: ${new Date(order.createdAt).toLocaleString('ru-RU')}
`;

    // Отправить чек если есть
    if (order.receiptImageUrl) {
      const receiptPath = order.receiptImageUrl.startsWith('/')
        ? `${WEBAPP_URL}${order.receiptImageUrl}`
        : order.receiptImageUrl;

      try {
        await bot.sendPhoto(ADMIN_GROUP_ID, receiptPath, {
          caption: message,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Одобрить',
                  callback_data: `approve:${order.id}`,
                },
                {
                  text: '❌ Отменить',
                  callback_data: `cancel:${order.id}`,
                },
              ],
            ],
          },
        });
      } catch (error) {
        // Если не удалось отправить фото, отправляем текст
        logger.warn('Не удалось отправить чек как фото, отправляю текстом');
        await bot.sendMessage(ADMIN_GROUP_ID, message + `\n\n🧾 Чек: ${receiptPath}`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Одобрить',
                  callback_data: `approve:${order.id}`,
                },
                {
                  text: '❌ Отменить',
                  callback_data: `cancel:${order.id}`,
                },
              ],
            ],
          },
        });
      }
    } else {
      // Отправить без чека
      await bot.sendMessage(ADMIN_GROUP_ID, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Одобрить',
                callback_data: `approve:${order.id}`,
              },
              {
                text: '❌ Отменить',
                callback_data: `cancel:${order.id}`,
              },
            ],
          ],
        },
      });
    }

    logger.info(`📨 Уведомление о заказе ${order.orderNumber} отправлено админам`);
  } catch (error) {
    logger.error('Ошибка отправки уведомления админам:', error);
    throw error;
  }
};
