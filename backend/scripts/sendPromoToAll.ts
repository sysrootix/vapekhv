import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { sendPromoBroadcast } from '../src/services/bot.service';
import { logger } from '../src/config/logger';

dotenv.config();

const prisma = new PrismaClient();

const BATCH_SIZE = 20;
const DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendPromoToAllUsers() {
  try {
    logger.info('📢 Старт массовой промо-рассылки по всем пользователям');

    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastPromoBroadcastSentAt" TIMESTAMP(3);');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
      },
    });

    if (users.length === 0) {
      logger.warn('⚠️ Нет пользователей с telegramId для рассылки');
      return;
    }

    logger.info(`📋 Всего пользователей для рассылки: ${users.length}`);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          try {
            await sendPromoBroadcast(user.telegramId);

            await prisma.user.update({
              where: { id: user.id },
              data: { lastPromoBroadcastSentAt: new Date() },
            });

            sent++;
          } catch (error) {
            failed++;
            logger.error(`Ошибка отправки пользователю ${user.telegramId}:`, error);
          }
        })
      );

      if (i + BATCH_SIZE < users.length) {
        await delay(DELAY_MS);
      }
    }

    logger.info(`✅ Массовая рассылка завершена: ${sent} успешно, ${failed} с ошибками`);
  } catch (error) {
    logger.error('❌ Критическая ошибка при массовой рассылке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendPromoToAllUsers().then(() => {
  logger.info('📢 Скрипт массовой рассылки завершён');
  process.exit(0);
}).catch((error) => {
  logger.error('❌ Скрипт завершился с ошибкой:', error);
  process.exit(1);
});
