import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { syncOrderWithMoySklad } from '../services/moysklad-sync.service';

async function main() {
  const dateArg = process.argv[2];

  if (!dateArg) {
    console.error('Usage: npx ts-node src/scripts/resyncOrdersByDate.ts <date>');
    console.error('Пример: npx ts-node src/scripts/resyncOrdersByDate.ts 06.01.2026');
    process.exit(1);
  }

  // Парсинг даты в формате DD.MM.YYYY
  const dateMatch = dateArg.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!dateMatch) {
    console.error('Неверный формат даты. Используйте формат DD.MM.YYYY, например: 06.01.2026');
    process.exit(1);
  }

  const [, day, month, year] = dateMatch;
  const startDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const endDate = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

  console.log(`\n🔍 Поиск заказов за ${dateArg}...`);
  console.log(`   Диапазон: ${startDate.toISOString()} - ${endDate.toISOString()}\n`);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
      promoCode: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (orders.length === 0) {
    console.log(`❌ Заказы за ${dateArg} не найдены`);
    process.exit(0);
  }

  console.log(`✅ Найдено заказов: ${orders.length}\n`);
  console.log('Список заказов:');
  orders.forEach((order, index) => {
    console.log(`  ${index + 1}. ${order.orderNumber} - ${order.totalAmount}₽ (статус: ${order.status})`);
  });

  console.log(`\n🚀 Начинаю синхронизацию...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    try {
      console.log(`[${i + 1}/${orders.length}] Синхронизирую заказ ${order.orderNumber}...`);
      await syncOrderWithMoySklad(order);
      successCount++;
      console.log(`  ✅ Заказ ${order.orderNumber} успешно синхронизирован`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Ошибка при синхронизации заказа ${order.orderNumber}:`, error);
      logger.error(`Ошибка синхронизации заказа ${order.orderNumber}:`, error);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`   Всего заказов: ${orders.length}`);
  console.log(`   ✅ Успешно: ${successCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Неожиданная ошибка:', error);
  await prisma.$disconnect();
  process.exit(1);
});
