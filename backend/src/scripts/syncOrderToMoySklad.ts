import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { syncOrderWithMoySklad } from '../services/moysklad-sync.service';

async function main() {
  const orderId = process.argv[2];

  if (!orderId) {
    console.error('Usage: npx ts-node src/scripts/syncOrderToMoySklad.ts <orderId>');
    process.exit(1);
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
      promoCode: true,
    },
  });

  if (!order) {
    console.error(`Order with id ${orderId} not found`);
    process.exit(1);
  }

  try {
    await syncOrderWithMoySklad(order);
    logger.info(`Тестовая синхронизация заказа ${order.orderNumber} завершена`);
  } catch (error) {
    logger.error('Ошибка тестовой синхронизации с МойСклад:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error('Unexpected error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
