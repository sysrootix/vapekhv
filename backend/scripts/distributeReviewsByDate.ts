import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function distributeReviewsByDate() {
  try {
    // Получаем все отзывы от тестовых пользователей (с telegramId начинающимся с 9000000000)
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            telegramId: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Фильтруем только тестовых пользователей (telegramId >= 9000000000)
    const testReviews = reviews.filter(
      (review) => review.user.telegramId >= BigInt(9000000000)
    );

    console.log(`Найдено ${testReviews.length} отзывов от тестовых пользователей.\n`);

    if (testReviews.length === 0) {
      console.log('Не найдено отзывов для обновления.');
      return;
    }

    // Создаем даты
    const dateNov7 = new Date('2025-11-07T12:00:00.000Z');
    const dateNov6 = new Date('2025-11-06T12:00:00.000Z');

    // Распределяем: первые 3 от 7 ноября, остальные от 6 ноября
    let updatedCount = 0;

    for (let i = 0; i < testReviews.length; i++) {
      const review = testReviews[i];
      const targetDate = i < 3 ? dateNov7 : dateNov6;
      const dateLabel = i < 3 ? '7 ноября' : '6 ноября';

      await prisma.review.update({
        where: { id: review.id },
        data: {
          createdAt: targetDate,
          updatedAt: targetDate,
        },
      });

      console.log(
        `✅ Обновлен отзыв от ${review.user.firstName} ${review.user.lastName || ''} на товар "${review.product.name}" → ${dateLabel}`
      );
      updatedCount++;
    }

    console.log(`\n✅ Всего обновлено ${updatedCount} отзывов.`);
    console.log(`   - 3 отзыва от 7 ноября`);
    console.log(`   - ${updatedCount - 3} отзывов от 6 ноября`);
  } catch (error) {
    console.error('Ошибка при обновлении дат отзывов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

distributeReviewsByDate();


