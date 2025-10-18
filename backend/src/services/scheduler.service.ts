import cron from 'node-cron';
import { logger } from '../config/logger';
import { moySkladConfig } from '../config/moysklad';
import { syncService } from './sync.service';
import { prisma } from '../config/database';


/**
 * Сервис планировщика задач
 */
export class SchedulerService {
  private syncTask: cron.ScheduledTask | null = null;
  private paymentCheckTask: cron.ScheduledTask | null = null;

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

        logger.info(`❌ Заказ ${order.orderNumber} автоматически отменён (истекло время оплаты)`);
      } catch (error) {
        logger.error(`Ошибка отмены заказа ${order.orderNumber}:`, error);
      }
    }
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
