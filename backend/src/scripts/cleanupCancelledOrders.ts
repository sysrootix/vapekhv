import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { deleteOrderFromMoySklad } from '../services/moysklad-sync.service';

async function main() {
  console.log('\n🔍 Поиск отмененных заказов в базе данных...\n');

  // Найти все отмененные заказы
  const cancelledOrders = await prisma.order.findMany({
    where: {
      status: 'CANCELLED',
    },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      createdAt: true,
      status: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (cancelledOrders.length === 0) {
    console.log('❌ Отмененные заказы не найдены');
    process.exit(0);
  }

  console.log(`✅ Найдено отмененных заказов: ${cancelledOrders.length}\n`);
  console.log('Список заказов:');
  cancelledOrders.forEach((order, index) => {
    console.log(
      `  ${index + 1}. ${order.orderNumber} - ${order.totalAmount}₽ (${order.createdAt.toLocaleDateString('ru-RU')})`
    );
  });

  console.log(`\n🚀 Начинаю очистку МойСклад...\n`);

  let processedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cancelledOrders.length; i++) {
    const order = cancelledOrders[i];
    try {
      console.log(`[${i + 1}/${cancelledOrders.length}] Проверяю заказ ${order.orderNumber}...`);
      
      await deleteOrderFromMoySklad(order.orderNumber);
      
      processedCount++;
      
      // Небольшая пауза между запросами, чтобы не перегружать API
      if (i < cancelledOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Ошибка при обработке заказа ${order.orderNumber}:`, error);
      logger.error(`Ошибка обработки заказа ${order.orderNumber}:`, error);
    }
  }

  // Подсчитаем результаты из логов
  // (deleteOrderFromMoySklad логирует результаты, но не возвращает их)
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`   Всего отмененных заказов: ${cancelledOrders.length}`);
  console.log(`   ✅ Обработано: ${processedCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log(`\nℹ️  Проверьте логи для детальной информации о каждом заказе`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Неожиданная ошибка:', error);
  await prisma.$disconnect();
  process.exit(1);
});
