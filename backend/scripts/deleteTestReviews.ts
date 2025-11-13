import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestReviews() {
  try {
    // Тексты тестовых отзывов из скрипта createTestReviews.ts
    const testReviewTexts = [
      'Отличный товар! Вкус на высоте, затяжка приятная. Рекомендую всем!',
      'Нормальный снюс, но вкус мог бы быть понасыщеннее. В целом, неплохо.',
      'Супер! Вкус просто огонь 🔥 Заказывал для себя и друзьям, все довольны.',
      'Качество на уровне, вкус как заявлено. Покупаю регулярно, ни разу не подводил.',
      'Хороший товар, но цена немного завышена. Вкус приятный, но не вау.',
      'Лучший что пробовал! Вкус просто бомба 💣 Заказываю уже третий раз.',
      'Неплохо, но ожидал большего. Вкус средний, затяжка нормальная, но не более.',
      'Приятный вкус, но быстро надоедает. Для разнообразия пойдет.',
      'Очень доволен покупкой! Быстрая доставка и отличный сервис.',
      'Не соответствует описанию, вкус слабый. Больше не возьму.',
      'Качество на уровне, вкус как заявлено. Покупаю регулярно, всегда свежий товар. Спасибо за быструю доставку!',
    ];

    // Найти все отзывы с этими текстами
    const testReviews = await prisma.review.findMany({
      where: {
        text: {
          in: testReviewTexts,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            username: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`Найдено ${testReviews.length} тестовых отзывов для удаления:`);
    testReviews.forEach((review, index) => {
      console.log(
        `  ${index + 1}. Отзыв от ${review.user.firstName || review.user.username || 'Пользователь'} на товар "${review.product.name}"`
      );
    });

    if (testReviews.length === 0) {
      console.log('Тестовые отзывы не найдены.');
      return;
    }

    // Удалить отзывы
    const deleteResult = await prisma.review.deleteMany({
      where: {
        text: {
          in: testReviewTexts,
        },
      },
    });

    console.log(`\n✅ Удалено ${deleteResult.count} тестовых отзывов.`);

    // Также удалить бонусные транзакции, связанные с этими отзывами (опционально)
    // Но лучше оставить их, так как они уже были начислены

  } catch (error) {
    console.error('Ошибка при удалении тестовых отзывов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestReviews();


