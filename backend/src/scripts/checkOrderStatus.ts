import 'dotenv/config';
import { prisma } from '../config/database';

async function main() {
  const orderNumber = process.argv[2] || 'ORD-1768539297922-WV4DD';
  
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      deliveryAddress: true,
      deliveryDate: true,
      deliveryTime: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        }
      }
    }
  });

  if (!order) {
    console.log(`❌ Заказ ${orderNumber} не найден`);
  } else {
    console.log('\n✅ Заказ найден:\n');
    console.log('📦 Номер заказа:', order.orderNumber);
    console.log('📊 Статус:', order.status);
    console.log('💰 Сумма:', order.totalAmount + '₽');
    console.log('📅 Дата создания:', order.createdAt.toLocaleString('ru-RU'));
    console.log('🚚 Адрес доставки:', order.deliveryAddress || '—');
    console.log('⏰ Дата доставки:', order.deliveryDate || '—');
    console.log('🕐 Время доставки:', order.deliveryTime || '—');
    console.log('👤 Клиент:', [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || '—');
    console.log('📞 Телефон:', order.user.phone || '—');
    console.log();
  }

  await prisma.$disconnect();
}

main().catch(console.error);
