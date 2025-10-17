import cron from 'node-cron';
import { logger } from '../config/logger';
import { moySkladConfig } from '../config/moysklad';
import { syncService } from './sync.service';

/**
 * Сервис планировщика задач
 */
export class SchedulerService {
  private syncTask: cron.ScheduledTask | null = null;

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
   * Остановить планировщик
   */
  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      logger.info('📅 Планировщик синхронизации остановлен');
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
