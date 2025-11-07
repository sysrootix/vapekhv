import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpecificReviews() {
  try {
    // Исправляем отзыв Елены Волковой
    const elenaReview = await prisma.review.findFirst({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      where: {
        text: {
          contains: 'пробовал',
        },
        user: {
          firstName: 'Елена',
        },
      },
    });

    if (elenaReview && elenaReview.text) {
      const fixedText = elenaReview.text.replace('пробовал', 'пробовала');
      await prisma.review.update({
        where: { id: elenaReview.id },
        data: { text: fixedText },
      });
      console.log('✅ Исправлен отзыв Елены Волковой: "пробовал" → "пробовала"');
    }

    // Исправляем отзыв Марии Ивановой
    const mariaReview = await prisma.review.findFirst({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      where: {
        text: {
          contains: 'доволен',
        },
        user: {
          firstName: 'Мария',
        },
      },
    });

    if (mariaReview && mariaReview.text) {
      const fixedText = mariaReview.text.replace('доволен', 'довольна');
      await prisma.review.update({
        where: { id: mariaReview.id },
        data: { text: fixedText },
      });
      console.log('✅ Исправлен отзыв Марии Ивановой: "доволен" → "довольна"');
    }

    // Исправляем отзыв Дмитрия Смирнова (если есть ошибки)
    const dmitryReview = await prisma.review.findFirst({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      where: {
        text: {
          contains: 'доволен',
        },
        user: {
          firstName: 'Дмитрий',
        },
      },
    });

    if (dmitryReview && dmitryReview.text) {
      // Проверяем, правильно ли написано для мужчины
      if (dmitryReview.text.includes('довольна')) {
        const fixedText = dmitryReview.text.replace('довольна', 'доволен');
        await prisma.review.update({
          where: { id: dmitryReview.id },
          data: { text: fixedText },
        });
        console.log('✅ Исправлен отзыв Дмитрия Смирнова: "довольна" → "доволен"');
      }
    }

    console.log('\n✅ Проверка и исправление завершены!');
  } catch (error) {
    console.error('Ошибка при исправлении отзывов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificReviews();

