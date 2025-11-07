import 'dotenv/config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

async function main() {
  const orderNumber = process.argv[2];
  const newDeliveryCost = parseFloat(process.argv[3]);

  if (!orderNumber || isNaN(newDeliveryCost)) {
    console.error('Usage: npx ts-node src/scripts/updateDeliveryCost.ts <orderNumber> <newDeliveryCost>');
    console.error('Example: npx ts-node src/scripts/updateDeliveryCost.ts ORD-1762395219500-PJJ4C 1025');
    process.exit(1);
  }

  try {
    // Найти заказ по номеру
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      console.error(`Заказ с номером ${orderNumber} не найден`);
      process.exit(1);
    }

    console.log(`Найден заказ: ${orderNumber}`);
    console.log(`Текущая стоимость доставки: ${order.deliveryCost}₽`);
    console.log(`Новая стоимость доставки: ${newDeliveryCost}₽`);

    // Обновить стоимость доставки
    await prisma.order.update({
      where: { orderNumber },
      data: {
        deliveryCost: newDeliveryCost,
        // Если нужно также обновить totalAmount, нужно пересчитать его
        // totalAmount вычисляется как: subtotal - promoDiscount - bonusUsed + deliveryCost
        // Найдем сумму товаров заказа
      },
    });

    // Пересчитаем totalAmount для корректности
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTotalAmount = subtotal - order.promoDiscount - order.bonusUsed + newDeliveryCost;

    const finalOrder = await prisma.order.update({
      where: { orderNumber },
      data: {
        totalAmount: Math.max(0, newTotalAmount),
      },
    });

    console.log(`✅ Стоимость доставки успешно обновлена!`);
    console.log(`Новая общая сумма заказа: ${finalOrder.totalAmount}₽`);
    logger.info(`Обновлена стоимость доставки для заказа ${orderNumber}: ${order.deliveryCost}₽ → ${newDeliveryCost}₽`);

  } catch (error) {
    logger.error('Ошибка при обновлении стоимости доставки:', error);
    console.error('Ошибка:', error);
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

