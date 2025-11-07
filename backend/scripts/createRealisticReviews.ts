import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Реалистичные имена и данные пользователей
const testUsers = [
  {
    firstName: 'Александр',
    lastName: 'Петров',
    username: 'alex_petrov',
    photoUrl: 'https://ui-avatars.com/api/?name=Alexander+Petrov&background=4f46e5&color=fff&size=128',
  },
  {
    firstName: 'Мария',
    lastName: 'Иванова',
    username: 'maria_ivanova',
    photoUrl: 'https://ui-avatars.com/api/?name=Maria+Ivanova&background=ec4899&color=fff&size=128',
  },
  {
    firstName: 'Дмитрий',
    lastName: 'Смирнов',
    username: 'dmitry_smirnov',
    photoUrl: 'https://ui-avatars.com/api/?name=Dmitry+Smirnov&background=10b981&color=fff&size=128',
  },
  {
    firstName: 'Анна',
    lastName: 'Козлова',
    username: 'anna_kozlova',
    photoUrl: 'https://ui-avatars.com/api/?name=Anna+Kozlova&background=f59e0b&color=fff&size=128',
  },
  {
    firstName: 'Иван',
    lastName: 'Соколов',
    username: 'ivan_sokolov',
    photoUrl: 'https://ui-avatars.com/api/?name=Ivan+Sokolov&background=3b82f6&color=fff&size=128',
  },
  {
    firstName: 'Елена',
    lastName: 'Волкова',
    username: 'elena_volkova',
    photoUrl: 'https://ui-avatars.com/api/?name=Elena+Volkova&background=8b5cf6&color=fff&size=128',
  },
  {
    firstName: 'Сергей',
    lastName: 'Новиков',
    username: 'sergey_novikov',
    photoUrl: 'https://ui-avatars.com/api/?name=Sergey+Novikov&background=ef4444&color=fff&size=128',
  },
];

// Реалистичные отзывы, соответствующие товарам
const realisticReviews = [
  {
    productNameKeywords: ['Lost Mary', 'MO', '20000'],
    rating: 5,
    text: 'Отличная одноразка! Вкус насыщенный, держит заряд долго. Уже третья покупка, качество стабильное. Рекомендую!',
  },
  {
    productNameKeywords: ['Vaporesso', 'Xros', 'Mini'],
    rating: 5,
    text: 'Отличное устройство! Компактное, удобное в использовании. Зарядка держится долго, вкус передает отлично. Очень доволен покупкой.',
  },
  {
    productNameKeywords: ['EPE', 'Unik', 'Vasi'],
    rating: 4,
    text: 'Хорошая одноразка за свою цену. Вкус приятный, но мог бы быть понасыщеннее. Затяжка комфортная. В целом доволен.',
  },
  {
    productNameKeywords: ['VMATE', 'Картридж'],
    rating: 5,
    text: 'Отличные картриджи! Совместимость идеальная, вкус передают четко. Покупаю регулярно, качество всегда на высоте.',
  },
  {
    productNameKeywords: ['Husky', '2Ice', 'Жидкость'],
    rating: 4,
    text: 'Хорошая жидкость, охлаждение чувствуется. Вкус мятный, приятный. Единственное - могло бы быть покрепче, но в целом норм.',
  },
  {
    productNameKeywords: ['Каста', '101'],
    rating: 5,
    text: 'Лучший снюс что пробовал! Вкус просто бомба, крепость в самый раз. Заказываю уже пятый раз, всегда свежий. Супер!',
  },
  {
    productNameKeywords: ['Lost Mary', 'BM', '5000'],
    rating: 5,
    text: 'Супер одноразка! Вкус огонь, затяжка приятная. Держит заряд хорошо, хватает надолго. Буду брать еще!',
  },
];

async function deleteOldTestReviews() {
  try {
    // Удаляем отзывы с тестовыми текстами
    const testTexts = [
      'Неплохо, но ожидал большего. Вкус средний, затяжка нормальная.',
      'Лучший что пробовал! Вкус просто бомба 💣',
      'Хороший товар, но цена немного завышена.',
      'Супер! Вкус просто огонь 🔥',
      'Нормальный снюс, но вкус мог бы быть понасыщеннее.',
      'Отличный товар! Вкус на высоте, затяжка приятная.',
    ];

    const deleteResult = await prisma.review.deleteMany({
      where: {
        OR: testTexts.map((text) => ({
          text: {
            contains: text.substring(0, 30), // Частичное совпадение
          },
        })),
      },
    });

    console.log(`✅ Удалено ${deleteResult.count} старых тестовых отзывов.`);
  } catch (error) {
    console.error('Ошибка при удалении старых отзывов:', error);
  }
}

async function createTestUsers() {
  const createdUsers = [];
  
  for (const userData of testUsers) {
    // Генерируем уникальный telegramId (начинаем с большого числа, чтобы не пересекаться с реальными)
    const telegramId = BigInt(9000000000 + Math.floor(Math.random() * 999999));
    
    try {
      // Проверяем, существует ли пользователь с таким telegramId
      const existing = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (!existing) {
        const user = await prisma.user.create({
          data: {
            telegramId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            photoUrl: userData.photoUrl,
            languageCode: 'ru',
            isPremium: false,
            isBot: false,
          },
        });
        createdUsers.push(user);
        console.log(`✅ Создан пользователь: ${userData.firstName} ${userData.lastName}`);
      } else {
        // Если пользователь существует, обновляем его данные
        const user = await prisma.user.update({
          where: { telegramId },
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            photoUrl: userData.photoUrl,
          },
        });
        createdUsers.push(user);
        console.log(`✅ Обновлен пользователь: ${userData.firstName} ${userData.lastName}`);
      }
    } catch (error) {
      console.error(`Ошибка при создании пользователя ${userData.firstName}:`, error);
    }
  }

  return createdUsers;
}

async function createRealisticReviews() {
  try {
    // Получаем все активные товары
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      take: 50,
    });

    if (products.length === 0) {
      console.log('Не найдено активных товаров для создания отзывов.');
      return;
    }

    // Создаем тестовых пользователей
    const users = await createTestUsers();

    if (users.length === 0) {
      console.log('Не удалось создать тестовых пользователей.');
      return;
    }

    const createdReviews = [];
    const usedProductIds = new Set<string>();

    // Создаем отзывы
    for (let i = 0; i < realisticReviews.length && i < users.length; i++) {
      const reviewData = realisticReviews[i];
      const user = users[i];

      // Находим подходящий товар по ключевым словам
      let product = products.find(
        (p) =>
          !usedProductIds.has(p.id) &&
          reviewData.productNameKeywords.some((keyword) =>
            p.name.toLowerCase().includes(keyword.toLowerCase())
          )
      );

      // Если не нашли по ключевым словам, берем случайный неиспользованный товар
      if (!product) {
        const availableProducts = products.filter((p) => !usedProductIds.has(p.id));
        if (availableProducts.length > 0) {
          product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        } else {
          console.log(`Не осталось доступных товаров для отзыва #${i + 1}`);
          continue;
        }
      }

      // Отмечаем товар как использованный
      usedProductIds.add(product.id);

      // Проверяем, не оставлял ли пользователь уже отзыв на этот товар
      const existingReview = await prisma.review.findFirst({
        where: {
          userId: user.id,
          productId: product.id,
        },
      });

      if (existingReview) {
        console.log(`Пользователь ${user.firstName} уже оставил отзыв на товар "${product.name}". Пропускаем.`);
        continue;
      }

      // Создаем отзыв
      const review = await prisma.review.create({
        data: {
          userId: user.id,
          productId: product.id,
          rating: reviewData.rating,
          text: reviewData.text,
          images: [],
          videos: [],
          bonusAwarded: 50,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
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

      // Начисляем бонусы (если нужно)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            bonusPoints: {
              increment: 50,
            },
          },
        });

        await prisma.bonusTransaction.create({
          data: {
            userId: user.id,
            amount: 50,
            type: 'GIFT',
            description: `Отзыв на товар "${product.name}"`,
          },
        });
      } catch (error) {
        console.error('Ошибка при начислении бонусов:', error);
      }

      createdReviews.push(review);
      console.log(
        `\n✅ Создан отзыв #${createdReviews.length}:`
      );
      console.log(`   Пользователь: ${review.user.firstName} ${review.user.lastName || ''}`);
      console.log(`   Товар: ${review.product.name}`);
      console.log(`   Рейтинг: ${review.rating}/5`);
      console.log(`   Текст: ${review.text?.substring(0, 60)}...`);
    }

    console.log(`\n✅ Успешно создано ${createdReviews.length} реалистичных отзывов!`);
  } catch (error) {
    console.error('Ошибка при создании реалистичных отзывов:', error);
  }
}

async function main() {
  try {
    console.log('Начинаем удаление старых тестовых отзывов...\n');
    await deleteOldTestReviews();

    console.log('\nНачинаем создание новых реалистичных отзывов...\n');
    await createRealisticReviews();
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

