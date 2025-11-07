import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Женские имена для определения пола
const femaleNames = ['Мария', 'Анна', 'Елена', 'Екатерина', 'Ольга', 'Татьяна', 'Наталья', 'Ирина', 'Светлана', 'Юлия', 'Анастасия', 'Дарья', 'Марина', 'Александра', 'Виктория'];

// Функция для определения пола по имени
function isFemale(firstName: string | null): boolean {
  if (!firstName) return false;
  return femaleNames.some(name => firstName.toLowerCase().includes(name.toLowerCase()));
}

// Функция для исправления текста отзыва с учетом пола
function fixReviewText(text: string, isFemaleUser: boolean): string {
  let fixedText = text;

  if (isFemaleUser) {
    // Исправляем глаголы прошедшего времени (с учетом регистра и контекста)
    fixedText = fixedText.replace(/\bпробовал\b/gi, (match) => {
      return match.charAt(0) === 'П' ? 'Пробовала' : 'пробовала';
    });
    fixedText = fixedText.replace(/\bзаказывал\b/gi, (match) => {
      return match.charAt(0) === 'З' ? 'Заказывала' : 'заказывала';
    });
    fixedText = fixedText.replace(/\bпокупал\b/gi, (match) => {
      return match.charAt(0) === 'П' ? 'Покупала' : 'покупала';
    });
    fixedText = fixedText.replace(/\bбрал\b/gi, (match) => {
      return match.charAt(0) === 'Б' ? 'Брала' : 'брала';
    });
    
    // Исправляем прилагательные и причастия
    fixedText = fixedText.replace(/\bдоволен\b/gi, (match) => {
      return match.charAt(0) === 'Д' ? 'Довольна' : 'довольна';
    });
    fixedText = fixedText.replace(/\bудовлетворен\b/gi, (match) => {
      return match.charAt(0) === 'У' ? 'Удовлетворена' : 'удовлетворена';
    });
    fixedText = fixedText.replace(/\bрад\b/gi, (match) => {
      return match.charAt(0) === 'Р' ? 'Рада' : 'рада';
    });
    
    // Исправляем "мог бы" на "могла бы"
    fixedText = fixedText.replace(/\bмог бы\b/gi, (match) => {
      return match.charAt(0) === 'М' ? 'Могла бы' : 'могла бы';
    });
  } else {
    // Для мужчин тоже проверяем, что все правильно
    fixedText = fixedText.replace(/\bпробовала\b/gi, (match) => {
      return match.charAt(0) === 'П' ? 'Пробовал' : 'пробовал';
    });
    fixedText = fixedText.replace(/\bзаказывала\b/gi, (match) => {
      return match.charAt(0) === 'З' ? 'Заказывал' : 'заказывал';
    });
    fixedText = fixedText.replace(/\bпокупала\b/gi, (match) => {
      return match.charAt(0) === 'П' ? 'Покупал' : 'покупал';
    });
    fixedText = fixedText.replace(/\bбрала\b/gi, (match) => {
      return match.charAt(0) === 'Б' ? 'Брал' : 'брал';
    });
    fixedText = fixedText.replace(/\bдовольна\b/gi, (match) => {
      return match.charAt(0) === 'Д' ? 'Доволен' : 'доволен';
    });
    fixedText = fixedText.replace(/\bудовлетворена\b/gi, (match) => {
      return match.charAt(0) === 'У' ? 'Удовлетворен' : 'удовлетворен';
    });
    fixedText = fixedText.replace(/\bрада\b/gi, (match) => {
      return match.charAt(0) === 'Р' ? 'Рад' : 'рад';
    });
    fixedText = fixedText.replace(/\bмогла бы\b/gi, (match) => {
      return match.charAt(0) === 'М' ? 'Мог бы' : 'мог бы';
    });
  }

  return fixedText;
}

async function fixAllReviews() {
  try {
    // Получаем все отзывы с пользователями
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
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
      where: {
        text: {
          not: null,
        },
      },
    });

    console.log(`Найдено ${reviews.length} отзывов для проверки.\n`);

    let fixedCount = 0;

    for (const review of reviews) {
      if (!review.text) continue;

      const isFemaleUser = isFemale(review.user.firstName);
      const originalText = review.text;
      const fixedText = fixReviewText(originalText, isFemaleUser);

      if (originalText !== fixedText) {
        await prisma.review.update({
          where: { id: review.id },
          data: { text: fixedText },
        });

        console.log(`✅ Исправлен отзыв от ${review.user.firstName} ${review.user.lastName || ''}:`);
        console.log(`   Было: ${originalText.substring(0, 80)}...`);
        console.log(`   Стало: ${fixedText.substring(0, 80)}...\n`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Всего исправлено ${fixedCount} отзывов из ${reviews.length}.`);
  } catch (error) {
    console.error('Ошибка при исправлении отзывов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllReviews();

