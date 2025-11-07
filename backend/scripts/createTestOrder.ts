import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createTestOrder() {
  try {
    const telegramId = BigInt(1008837582);

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      console.error('Пользователь с Telegram ID 1008837582 не найден');
      process.exit(1);
    }

    console.log(`Найден пользователь: ${user.firstName || user.username || user.id}`);

    // Проверяем, есть ли товары
    let product = await prisma.product.findFirst({
      where: {
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    // Если нет товаров, создаем тестовый товар
    if (!product) {
      // Находим или создаем категорию
      let category = await prisma.category.findFirst({
        where: { isActive: true },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: 'Тестовая категория',
            slug: 'test-category',
            isActive: true,
            sortOrder: 0,
          },
        });
        console.log('Создана тестовая категория');
      }

      product = await prisma.product.create({
        data: {
          name: 'Тестовый товар для отзывов',
          slug: 'test-product-reviews',
          description: 'Это тестовый товар для проверки системы отзывов',
          price: 1000,
          inStock: true,
          stockCount: 100,
          isActive: true,
          isFeatured: false,
          categoryId: category.id,
        },
        include: {
          category: true,
        },
      });

      console.log(`Создан тестовый товар: ${product.name}`);
    } else {
      console.log(`Найден товар: ${product.name}`);
    }

    // Генерируем номер заказа
    const orderNumber = `TEST-${Date.now()}`;

    // Создаем тестовый заказ со статусом DELIVERED
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'DELIVERED',
        totalAmount: product.price,
        deliveryCost: 0,
        bonusUsed: 0,
        bonusEarned: Math.floor(product.price * 0.05),
        deliveryAddress: 'Тестовый адрес для проверки отзывов',
        deliveryPhone: user.phone || '+79999999999',
        deliveryDate: new Date().toLocaleDateString('ru-RU'),
        deliveryTime: '12:00',
        paidAt: new Date(),
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: product.price,
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('\n✅ Тестовый заказ создан:');
    console.log(`   Номер заказа: ${order.orderNumber}`);
    console.log(`   Статус: ${order.status}`);
    console.log(`   Товар: ${order.items[0].product.name}`);
    console.log(`   Цена: ${order.items[0].price}₽`);
    console.log(`   Сумма заказа: ${order.totalAmount}₽`);
    console.log(`\nТеперь можно оставить отзыв на товар "${order.items[0].product.name}"`);

    // Начисляем бонусы за доставленный заказ
    if (order.bonusEarned > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          bonusPoints: {
            increment: order.bonusEarned,
          },
          totalSpent: {
            increment: order.totalAmount - order.deliveryCost,
          },
        },
      });

      await prisma.bonusTransaction.create({
        data: {
          userId: user.id,
          amount: order.bonusEarned,
          type: 'EARNED',
          description: `Начислено за доставленный заказ ${order.orderNumber}`,
          orderId: order.id,
        },
      });

      console.log(`\n✅ Начислено ${order.bonusEarned} бонусов за заказ`);
    }

    console.log('\n✅ Готово! Теперь в приложении появится уведомление о возможности оставить отзыв.');
  } catch (error) {
    console.error('Ошибка при создании тестового заказа:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrder();
