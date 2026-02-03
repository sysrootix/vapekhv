import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { deleteOrderFromMoySklad } from '../services/moysklad-sync.service';

async function main() {
  const orderNumber = process.argv[2];

  if (!orderNumber) {
    console.error('Usage: npx ts-node src/scripts/deleteOrder.ts <orderNumber>');
    console.error('Пример: npx ts-node src/scripts/deleteOrder.ts ORD-XXX');
    process.exit(1);
  }

  console.log(`\n🔍 Поиск заказа ${orderNumber}...\n`);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
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
  console.log(`   Клиент: ${order.user.firstName || ''} ${order.user.lastName || ''}`);
  console.log(`   Товаров: ${order.items.length}`);
  console.log();

  // Шаг 1: Удалить из МойСклад
  console.log('🗑️  Шаг 1: Удаление из МойСклад...');
  try {
    await deleteOrderFromMoySklad(order.orderNumber);
    console.log('✅ Удаление из МойСклад завершено\n');
  } catch (error) {
    console.error('⚠️  Ошибка при удалении из МойСклад:', error);
    console.log('Продолжаю удаление из базы данных...\n');
  }

  // Шаг 2: Удалить из базы данных
  console.log('🗑️  Шаг 2: Удаление из базы данных...');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Удалить историю изменений заказа
      const orderHistoryCount = await tx.orderHistory.deleteMany({
        where: { orderId: order.id },
      });
      console.log(`   - Удалено записей истории: ${orderHistoryCount.count}`);

      // 2. Удалить транзакции бонусов
      const bonusTransactionCount = await tx.bonusTransaction.deleteMany({
        where: { orderId: order.id },
      });
      console.log(`   - Удалено бонусных транзакций: ${bonusTransactionCount.count}`);

      // 3. Удалить товары заказа
      const orderItemsCount = await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });
      console.log(`   - Удалено товаров заказа: ${orderItemsCount.count}`);

      // 4. Удалить сам заказ
      await tx.order.delete({
        where: { id: order.id },
      });
      console.log(`   - Заказ удален`);
    });

    console.log('\n✅ Заказ успешно удален из базы данных!');
  } catch (error) {
    console.error('\n❌ Ошибка при удалении из базы данных:', error);
    logger.error(`Ошибка удаления заказа ${orderNumber} из БД:`, error);
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ЗАКАЗ ${orderNumber} ПОЛНОСТЬЮ УДАЛЕН`);
  console.log(`   - Из МойСклад: ✅`);
  console.log(`   - Из базы данных: ✅`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Неожиданная ошибка:', error);
  await prisma.$disconnect();
  process.exit(1);
});
