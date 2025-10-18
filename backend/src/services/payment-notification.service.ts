import { Prisma } from '@prisma/client';
import bot from './bot.service';
import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';
import { prisma } from '../config/database';


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
      if (order.status !== 'PENDING') {
        await bot.answerCallbackQuery(query.id, {
          text: '⚠️ Заказ уже обработан',
          show_alert: true,
        });
        return;
      }

      // Выполняем подтверждение
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Обновить статус заказа
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' },
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

        // Проверяем, есть ли в сообщении фото (caption) или текст
        const statusText = `\n\n✅ <b>ОДОБРЕНО</b> администратором @${query.from?.username || 'Unknown'}`;

        if (query.message.photo && query.message.caption) {
          // Если сообщение с фото, редактируем caption
          await bot.editMessageCaption(
            `${query.message.caption}${statusText}`,
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              parse_mode: 'HTML',
            }
          );
        } else if (query.message.text) {
          // Если обычное текстовое сообщение, редактируем text
          await bot.editMessageText(
            `${query.message.text}${statusText}`,
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              parse_mode: 'HTML',
            }
          );
        }
      }

      await bot.answerCallbackQuery(query.id, {
        text: '✅ Заказ подтвержден!',
      });

      // Отправить уведомление пользователю о подтверждении
      try {
        const updatedOrder = await prisma.order.findUnique({
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
        if (updatedOrder) {
          await sendOrderStatusNotification(updatedOrder, 'CONFIRMED');
        }
      } catch (error) {
        logger.error('Ошибка отправки уведомления пользователю:', error);
      }

      logger.info(`✅ Заказ ${order.orderNumber} подтвержден админом @${query.from?.username}`);

    } else if (action === 'cancel') {
      // Отменить заказ
      if (order.status === 'CANCELLED' || order.status === 'PAYMENT_EXPIRED') {
        await bot.answerCallbackQuery(query.id, {
          text: '⚠️ Заказ уже отменён',
          show_alert: true,
        });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
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

        // Проверяем, есть ли в сообщении фото (caption) или текст
        const statusText = `\n\n❌ <b>ОТМЕНЕНО</b> администратором @${query.from?.username || 'Unknown'}`;

        if (query.message.photo && query.message.caption) {
          // Если сообщение с фото, редактируем caption
          await bot.editMessageCaption(
            `${query.message.caption}${statusText}`,
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              parse_mode: 'HTML',
            }
          );
        } else if (query.message.text) {
          // Если обычное текстовое сообщение, редактируем text
          await bot.editMessageText(
            `${query.message.text}${statusText}`,
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              parse_mode: 'HTML',
            }
          );
        }
      }

      await bot.answerCallbackQuery(query.id, {
        text: '❌ Заказ отменён!',
      });

      // Отправить уведомление пользователю об отмене
      try {
        const updatedOrder = await prisma.order.findUnique({
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
        if (updatedOrder) {
          await sendOrderStatusNotification(updatedOrder, 'CANCELLED');
        }
      } catch (error) {
        logger.error('Ошибка отправки уведомления пользователю:', error);
      }

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

// Отправить уведомление пользователю об изменении статуса заказа
export const sendOrderStatusNotification = async (order: any, status: string) => {
  if (!bot) {
    logger.warn('Telegram bot не инициализирован, уведомление пользователю не отправлено');
    return;
  }

  try {
    const statusMessages: { [key: string]: { title: string; description: string } } = {
      CONFIRMED: {
        title: '✅ Заказ подтвержден',
        description: 'Ваш заказ подтвержден и принят в обработку'
      },
      PROCESSING: {
        title: '🔄 Заказ в обработке',
        description: 'Ваш заказ находится в обработке'
      },
      SHIPPED: {
        title: '📦 Заказ отправлен',
        description: 'Ваш заказ передан курьеру для доставки'
      },
      DELIVERED: {
        title: '✅ Заказ доставлен',
        description: 'Ваш заказ успешно доставлен!'
      },
      CANCELLED: {
        title: '❌ Заказ отменен',
        description: 'Ваш заказ был отменен'
      },
    };

    const statusInfo = statusMessages[status] || { title: 'ℹ️ Статус заказа обновлен', description: '' };

    // Форматирование даты доставки
    let deliveryDateText = 'Не указана';
    if (order.deliveryTime === 'Ближайшее время') {
      deliveryDateText = 'Ближайшее время';
    } else if (order.deliveryDate) {
      deliveryDateText = `${order.deliveryDate}${order.deliveryTime && order.deliveryTime !== 'Ближайшее время' ? ', ' + order.deliveryTime : ''}`;
    }

    // Форматируем список товаров с улучшенной читаемостью
    const items = order.items
      .map((item: any, index: number) => {
        const options = item.selectedOptions
          ? '\n  ' + Object.entries(item.selectedOptions)
              .map(([key, value]) => `<i>${key}:</i> ${value}`)
              .join(', ')
          : '';
        return `<b>${index + 1}.</b> ${item.product.name} × ${item.quantity}${options}`;
      })
      .join('\n\n');

    // Форматируем дату создания заказа
    const orderDate = new Date(order.createdAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Формируем основное сообщение
    let message = `<b>${statusInfo.title}</b>\n\n${statusInfo.description}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📦 <b>Заказ:</b> #${order.orderNumber}\n`;
    message += `📅 <b>Дата:</b> ${orderDate}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `<b>Товары:</b>\n\n${items}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 <b>Итого:</b> ${order.totalAmount.toLocaleString('ru-RU')}₽\n`;

    // Добавляем информацию о бонусах
    if (order.bonusUsed > 0) {
      message += `🎁 <b>Использовано бонусов:</b> ${order.bonusUsed}\n`;
    }
    if (status === 'DELIVERED' && order.bonusEarned > 0) {
      message += `⭐️ <b>Начислено бонусов:</b> +${order.bonusEarned}\n`;
    }

    // Информация о доставке
    message += `\n━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `<b>Информация о доставке:</b>\n\n`;
    message += `📍 ${order.deliveryAddress || 'Адрес не указан'}\n`;
    message += `📞 ${order.deliveryPhone || 'Телефон не указан'}\n`;
    message += `📅 ${deliveryDateText}`;

    await bot.sendMessage(order.user.telegramId, message, {
      parse_mode: 'HTML',
    });

    logger.info(`📨 Уведомление о статусе "${status}" отправлено пользователю ${order.user.telegramId}`);
  } catch (error) {
    logger.error('Ошибка отправки уведомления пользователю:', error);
  }
};

// Отправить уведомление админам о новом чеке
export const sendPaymentNotification = async (order: any) => {
  if (!bot || !ADMIN_GROUP_ID) {
    logger.warn('Telegram bot не инициализирован, уведомление не отправлено');
    return;
  }

  try {
    // Форматируем список товаров с улучшенной читаемостью
    const items = order.items
      .map((item: any, index: number) => {
        const itemTotal = (item.price * item.quantity).toLocaleString('ru-RU');
        const options = item.selectedOptions
          ? '\n     ' + Object.entries(item.selectedOptions)
              .map(([key, value]) => `<i>${key}:</i> ${value}`)
              .join(', ')
          : '';
        return `  <b>${index + 1}.</b> ${item.product.name}\n     Количество: ${item.quantity} шт.\n     Сумма: ${itemTotal}₽${options}`;
      })
      .join('\n\n');

    // Форматирование даты доставки
    let deliveryDateText = 'Не указана';
    if (order.deliveryTime === 'Ближайшее время') {
      deliveryDateText = 'Ближайшее время';
    } else if (order.deliveryDate) {
      deliveryDateText = `${order.deliveryDate} ${order.deliveryTime || ''}`;
    }

    // Добавляем +10 часов для хабаровского времени
    const khabarovskTime = new Date(order.createdAt);
    khabarovskTime.setHours(khabarovskTime.getHours() + 10);
    const formattedTime = khabarovskTime.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Формируем основное сообщение
    let message = `🔔 <b>НОВАЯ ОПЛАТА</b>\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📦 <b>Заказ:</b> #${order.orderNumber}\n`;
    message += `⏰ <b>Создан:</b> ${formattedTime}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `<b>Информация о клиенте:</b>\n\n`;
    message += `👤 ${order.user.firstName || ''} ${order.user.lastName || ''}\n`;
    message += `   @${order.user.username || 'без username'}\n`;
    message += `   ID: <code>${order.user.telegramId}</code>\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `<b>Товары:</b>\n\n${items}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 <b>Итого:</b> ${order.totalAmount.toLocaleString('ru-RU')}₽\n`;

    if (order.bonusUsed > 0) {
      message += `🎁 <b>Использовано бонусов:</b> ${order.bonusUsed}\n`;
    }
    if (order.bonusEarned > 0) {
      message += `⭐️ <b>К начислению бонусов:</b> +${order.bonusEarned}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `<b>Информация о доставке:</b>\n\n`;
    message += `📍 ${order.deliveryAddress || 'Не указан'}\n`;
    message += `📞 ${order.deliveryPhone || 'Не указан'}\n`;
    message += `📅 ${deliveryDateText}`;

    if (order.comment) {
      message += `\n\n💬 <b>Комментарий:</b>\n${order.comment}`;
    }

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
