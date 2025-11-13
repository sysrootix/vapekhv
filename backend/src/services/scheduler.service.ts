import cron from 'node-cron';
import { logger } from '../config/logger';
import { moySkladConfig } from '../config/moysklad';
import { syncService } from './sync.service';
import { prisma } from '../config/database';
import { sendStockNotification, sendPromoBroadcast } from './bot.service';
import { referralService } from './referral.service';


/**
 * Сервис планировщика задач
 */
export class SchedulerService {
  private syncTask: cron.ScheduledTask | null = null;
  private paymentCheckTask: cron.ScheduledTask | null = null;
  private stockNotificationTask: cron.ScheduledTask | null = null;
  private promoBroadcastTask: cron.ScheduledTask | null = null;

  /**
   * Запустить планировщик синхронизации
   */
  start(): void {
    try {
      // Синхронизация каждые 30 минут
      const cronExpression = `*/${moySkladConfig.syncIntervalMinutes} * * * *`;

      this.syncTask = cron.schedule(cronExpression, async () => {
        logger.info('⏰ Запуск автоматической синхронизации с МойСклад');
        try {
          await syncService.syncCatalog();
        } catch (error) {
          logger.error('Ошибка автоматической синхронизации:', error);
        }
      });

      logger.info(
        `📅 Планировщик синхронизации запущен (каждые ${moySkladConfig.syncIntervalMinutes} минут)`
      );
    } catch (error) {
      logger.error('Ошибка запуска планировщика:', error);
    }
  }

  /**
   * Запустить планировщик проверки истекших платежей
   */
  startPaymentCheck(): void {
    try {
      // Проверка каждую минуту
      this.paymentCheckTask = cron.schedule('* * * * *', async () => {
        try {
          await this.checkExpiredPayments();
        } catch (error) {
          logger.error('Ошибка проверки истекших платежей:', error);
        }
      });

      logger.info('⏰ Планировщик проверки платежей запущен (каждую минуту)');
    } catch (error) {
      logger.error('Ошибка запуска планировщика платежей:', error);
    }
  }

  /**
   * Запустить планировщик проверки уведомлений о наличии товаров
   */
  startStockNotificationCheck(): void {
    try {
      // Проверка каждые 10 минут
      this.stockNotificationTask = cron.schedule('*/10 * * * *', async () => {
        try {
          await this.checkStockNotifications();
        } catch (error) {
          logger.error('Ошибка проверки уведомлений о наличии:', error);
        }
      });

      logger.info('🔔 Планировщик уведомлений о наличии запущен (каждые 10 минут)');
    } catch (error) {
      logger.error('Ошибка запуска планировщика уведомлений:', error);
    }
  }

  /**
   * Запустить планировщик промо-рассылки
   */
  startPromoBroadcast(): void {
    try {
      // Запуск каждый день в 10:00 для проверки, кому нужно отправить рассылку
      this.promoBroadcastTask = cron.schedule('0 10 * * *', async () => {
        try {
          await this.sendPromoBroadcasts();
        } catch (error) {
          logger.error('Ошибка отправки промо-рассылки:', error);
        }
      });

      logger.info('📢 Планировщик промо-рассылки запущен (каждый день в 10:00)');
    } catch (error) {
      logger.error('Ошибка запуска планировщика промо-рассылки:', error);
    }
  }

  /**
   * Проверить и отменить заказы с истекшим временем оплаты
   */
  private async checkExpiredPayments(): Promise<void> {
    const now = new Date();

    // Найти заказы со статусом PENDING_PAYMENT и истекшим временем оплаты
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentExpiresAt: {
          lte: now,
        },
      },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    logger.info(`⏰ Найдено ${expiredOrders.length} заказов с истекшим временем оплаты`);

    // Отменить каждый заказ
    for (const order of expiredOrders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_EXPIRED' },
        });

        await referralService.revertQualification(order.id);

        logger.info(`❌ Заказ ${order.orderNumber} автоматически отменён (истекло время оплаты)`);
      } catch (error) {
        logger.error(`Ошибка отмены заказа ${order.orderNumber}:`, error);
      }
    }
  }

  /**
   * Проверить и отправить уведомления о поступлении товаров
   */
  private async checkStockNotifications(): Promise<void> {
    // Найти все подписки на уведомления, которые еще не отправлены
    const notifications = await prisma.stockNotification.findMany({
      where: {
        notified: false,
      },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
        user: true,
      },
    });

    if (notifications.length === 0) {
      return;
    }

    logger.info(`🔔 Найдено ${notifications.length} подписок на уведомления`);

    for (const notification of notifications) {
      try {
        const product = notification.product;

        // Проверяем наличие товара
        let isInStock = false;

        if (product.variants && product.variants.length > 0) {
          // Если есть варианты - проверяем хотя бы один
          isInStock = product.variants.some(v => v.inStock && v.stockCount > 0);
        } else {
          // Если нет вариантов - проверяем основной товар
          isInStock = product.inStock && product.stockCount > 0;
        }

        // Если товар поступил в наличие - отправляем уведомление
        if (isInStock) {
          await sendStockNotification(
            notification.user.telegramId,
            product.name,
            product.id
          );

          // Помечаем уведомление как отправленное
          await prisma.stockNotification.update({
            where: { id: notification.id },
            data: {
              notified: true,
              notifiedAt: new Date(),
            },
          });

          logger.info(
            `✅ Отправлено уведомление пользователю ${notification.user.telegramId} о товаре "${product.name}"`
          );
        }
      } catch (error) {
        logger.error(
          `Ошибка отправки уведомления для товара ${notification.productId}:`,
          error
        );
      }
    }
  }

  /**
   * Отправить промо-рассылку всем клиентам, которым не отправляли более 3 дней
   */
  private async sendPromoBroadcasts(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Найти всех пользователей, которым не отправляли рассылку более 3 дней
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { lastPromoBroadcastSentAt: null }, // Никогда не отправляли
          { lastPromoBroadcastSentAt: { lt: threeDaysAgo } }, // Отправляли более 3 дней назад
        ],
      },
      select: {
        id: true,
        telegramId: true,
      },
    });

    if (users.length === 0) {
      logger.info('📢 Нет пользователей для промо-рассылки');
      return;
    }

    logger.info(`📢 Найдено ${users.length} пользователей для промо-рассылки`);

    let sent = 0;
    let failed = 0;

    // Отправляем рассылку с ограничением скорости (20 сообщений в секунду)
    const batchSize = 20;
    const delayBetweenBatches = 1000;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            await sendPromoBroadcast(user.telegramId);
            
            // Обновляем дату последней рассылки
            await prisma.user.update({
              where: { id: user.id },
              data: { lastPromoBroadcastSentAt: new Date() },
            });

            sent++;
          } catch (error) {
            failed++;
            logger.error(`Ошибка отправки промо-рассылки пользователю ${user.telegramId}:`, error);
          }
        })
      );

      // Задержка между батчами (кроме последнего)
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    logger.info(`📢 Промо-рассылка завершена: ${sent} отправлено, ${failed} ошибок`);
  }

  /**
   * Остановить планировщик
   */
  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      logger.info('📅 Планировщик синхронизации остановлен');
    }

    if (this.paymentCheckTask) {
      this.paymentCheckTask.stop();
      logger.info('⏰ Планировщик проверки платежей остановлен');
    }

    if (this.stockNotificationTask) {
      this.stockNotificationTask.stop();
      logger.info('🔔 Планировщик уведомлений остановлен');
    }

    if (this.promoBroadcastTask) {
      this.promoBroadcastTask.stop();
      logger.info('📢 Планировщик промо-рассылки остановлен');
    }
  }

  /**
   * Запустить синхронизацию вручную
   */
  async triggerSync(): Promise<void> {
    logger.info('🔧 Запуск синхронизации вручную');
    await syncService.syncCatalog();
  }
}

// Экспорт singleton instance
export const schedulerService = new SchedulerService();
