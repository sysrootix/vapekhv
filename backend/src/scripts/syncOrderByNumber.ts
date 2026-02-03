import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { syncOrderWithMoySklad } from '../services/moysklad-sync.service';

async function main() {
  const orderNumber = process.argv[2];

  if (!orderNumber) {
    console.error('Usage: npx ts-node src/scripts/syncOrderByNumber.ts <orderNumber>');
    console.error('Пример: npx ts-node src/scripts/syncOrderByNumber.ts ORD-1766922049957-OL7WS');
    process.exit(1);
  }

  console.log(`\n🔍 Поиск заказа ${orderNumber}...\n`);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
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
    console.error(`❌ Заказ ${orderNumber} не найден в базе данных`);
    process.exit(1);
  }

  console.log(`✅ Заказ найден:`);
  console.log(`   Номер: ${order.orderNumber}`);
  console.log(`   Сумма: ${order.totalAmount}₽`);
  console.log(`   Статус: ${order.status}`);
  console.log(`   Дата создания: ${order.createdAt.toLocaleString('ru-RU')}`);
  console.log(`   Клиент: ${order.user.firstName || ''} ${order.user.lastName || ''} (${order.user.phone || 'телефон не указан'})`);
  console.log(`   Товаров: ${order.items.length}`);
  console.log();

  console.log(`🚀 Начинаю синхронизацию с МойСклад...\n`);

  try {
    await syncOrderWithMoySklad(order);
    console.log(`\n✅ Заказ ${order.orderNumber} успешно синхронизирован с МойСклад!`);
  } catch (error) {
    console.error(`\n❌ Ошибка при синхронизации заказа ${order.orderNumber}:`, error);
    logger.error(`Ошибка синхронизации заказа ${order.orderNumber}:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error('Неожиданная ошибка:', error);
  await prisma.$disconnect();
  process.exit(1);
});
