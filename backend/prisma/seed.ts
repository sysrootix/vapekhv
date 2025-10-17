import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Создаем категории
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'pod-sistemy' },
      update: {},
      create: {
        name: 'POD-системы',
        slug: 'pod-sistemy',
        description: 'Компактные POD-системы для повседневного использования',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'zhidkosti' },
      update: {},
      create: {
        name: 'Жидкости',
        slug: 'zhidkosti',
        description: 'Большой выбор жидкостей для вейпинга',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'odnorazki' },
      update: {},
      create: {
        name: 'Одноразки',
        slug: 'odnorazki',
        description: 'Одноразовые электронные сигареты',
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'aksessuary' },
      update: {},
      create: {
        name: 'Аксессуары',
        slug: 'aksessuary',
        description: 'Картриджи, испарители и другие аксессуары',
        sortOrder: 4,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Создано категорий:', categories.length);

  // Создаем продукты
  const products = [
    // POD-системы
    {
      name: 'SMOK Nord 4',
      slug: 'smok-nord-4',
      description: 'Мощная POD-система с аккумулятором 2000 мАч',
      price: 2990,
      oldPrice: 3490,
      categoryId: categories[0].id,
      inStock: true,
      stockCount: 15,
      isFeatured: true,
    },
    {
      name: 'VOOPOO Drag Nano 2',
      slug: 'voopoo-drag-nano-2',
      description: 'Стильная и компактная POD-система',
      price: 2490,
      categoryId: categories[0].id,
      inStock: true,
      stockCount: 8,
      isFeatured: true,
    },
    {
      name: 'Vaporesso XROS 3',
      slug: 'vaporesso-xros-3',
      description: 'Популярная POD-система с отличной передачей вкуса',
      price: 2790,
      oldPrice: 3290,
      categoryId: categories[0].id,
      inStock: true,
      stockCount: 12,
      isFeatured: true,
    },

    // Жидкости
    {
      name: 'Fruit Splash 30ml',
      slug: 'fruit-splash-30ml',
      description: 'Освежающий фруктовый микс',
      price: 490,
      categoryId: categories[1].id,
      inStock: true,
      stockCount: 50,
      isFeatured: false,
    },
    {
      name: 'Mango Ice 30ml',
      slug: 'mango-ice-30ml',
      description: 'Сочное манго с холодком',
      price: 490,
      categoryId: categories[1].id,
      inStock: true,
      stockCount: 45,
      isFeatured: true,
    },
    {
      name: 'Berry Mix 30ml',
      slug: 'berry-mix-30ml',
      description: 'Микс лесных ягод',
      price: 490,
      categoryId: categories[1].id,
      inStock: true,
      stockCount: 40,
      isFeatured: false,
    },

    // Одноразки
    {
      name: 'HQD Cuvie Plus',
      slug: 'hqd-cuvie-plus',
      description: 'Популярная одноразка на 1200 затяжек',
      price: 390,
      oldPrice: 490,
      categoryId: categories[2].id,
      inStock: true,
      stockCount: 100,
      isFeatured: true,
    },
    {
      name: 'Elf Bar BC5000',
      slug: 'elf-bar-bc5000',
      description: 'Премиум одноразка на 5000 затяжек',
      price: 890,
      categoryId: categories[2].id,
      inStock: true,
      stockCount: 75,
      isFeatured: true,
    },
    {
      name: 'Lost Mary BM600',
      slug: 'lost-mary-bm600',
      description: 'Компактная одноразка с ярким дизайном',
      price: 450,
      categoryId: categories[2].id,
      inStock: true,
      stockCount: 60,
      isFeatured: false,
    },

    // Аксессуары
    {
      name: 'Картриджи SMOK Nord (3 шт)',
      slug: 'smok-nord-cartridge-3pack',
      description: 'Сменные картриджи для SMOK Nord',
      price: 490,
      categoryId: categories[3].id,
      inStock: true,
      stockCount: 30,
      isFeatured: false,
    },
    {
      name: 'Испаритель VOOPOO (5 шт)',
      slug: 'voopoo-coil-5pack',
      description: 'Сменные испарители для VOOPOO',
      price: 790,
      categoryId: categories[3].id,
      inStock: true,
      stockCount: 25,
      isFeatured: false,
    },
  ];

  const createdProducts = [];
  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
    createdProducts.push(created);
  }

  console.log('✅ Создано продуктов:', products.length);

  // Добавляем характеристики для товаров
  const characteristics = [
    // POD-системы - Цвет
    {
      productSlug: 'smok-nord-4',
      characteristics: [
        {
          name: 'Цвет',
          values: ['Черный', 'Серебристый', 'Синий', 'Красный'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
    {
      productSlug: 'voopoo-drag-nano-2',
      characteristics: [
        {
          name: 'Цвет',
          values: ['Черный', 'Белый', 'Розовый'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
    {
      productSlug: 'vaporesso-xros-3',
      characteristics: [
        {
          name: 'Цвет',
          values: ['Черный', 'Серый', 'Синий', 'Зеленый'],
          required: true,
          sortOrder: 1,
        },
      ],
    },

    // Жидкости - Вкус и Крепость
    {
      productSlug: 'fruit-splash-30ml',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Клубника', 'Арбуз', 'Микс фруктов', 'Дыня'],
          required: true,
          sortOrder: 1,
        },
        {
          name: 'Крепость',
          values: ['0 мг', '3 мг', '6 мг', '12 мг'],
          required: true,
          sortOrder: 2,
        },
      ],
    },
    {
      productSlug: 'mango-ice-30ml',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Манго', 'Манго-Персик', 'Манго-Маракуйя'],
          required: true,
          sortOrder: 1,
        },
        {
          name: 'Крепость',
          values: ['0 мг', '3 мг', '6 мг', '12 мг'],
          required: true,
          sortOrder: 2,
        },
      ],
    },
    {
      productSlug: 'berry-mix-30ml',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Черника', 'Малина', 'Лесные ягоды', 'Вишня'],
          required: true,
          sortOrder: 1,
        },
        {
          name: 'Крепость',
          values: ['0 мг', '3 мг', '6 мг', '12 мг'],
          required: true,
          sortOrder: 2,
        },
      ],
    },

    // Одноразки - Вкус
    {
      productSlug: 'hqd-cuvie-plus',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Яблоко', 'Виноград', 'Персик', 'Дыня', 'Арбуз', 'Манго'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
    {
      productSlug: 'elf-bar-bc5000',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Клубника-банан', 'Арбуз', 'Черника', 'Персик', 'Манго-персик'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
    {
      productSlug: 'lost-mary-bm600',
      characteristics: [
        {
          name: 'Вкус',
          values: ['Яблоко', 'Персик', 'Клубника', 'Виноград', 'Дыня'],
          required: true,
          sortOrder: 1,
        },
      ],
    },

    // Аксессуары - Сопротивление
    {
      productSlug: 'smok-nord-cartridge-3pack',
      characteristics: [
        {
          name: 'Тип',
          values: ['RPM', 'Nord', 'LP2'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
    {
      productSlug: 'voopoo-coil-5pack',
      characteristics: [
        {
          name: 'Сопротивление',
          values: ['0.7 Ом', '1.0 Ом', '1.2 Ом'],
          required: true,
          sortOrder: 1,
        },
      ],
    },
  ];

  let characteristicsCount = 0;
  for (const item of characteristics) {
    const product = createdProducts.find((p) => p.slug === item.productSlug);
    if (product) {
      // Удаляем существующие характеристики для этого товара
      await prisma.productCharacteristic.deleteMany({
        where: { productId: product.id },
      });
      
      // Создаем новые характеристики
      for (const char of item.characteristics) {
        await prisma.productCharacteristic.create({
          data: {
            name: char.name,
            values: char.values,
            required: char.required,
            sortOrder: char.sortOrder,
            productId: product.id,
          },
        });
        characteristicsCount++;
      }
    }
  }

  console.log('✅ Создано характеристик:', characteristicsCount);
  console.log('🎉 База данных успешно заполнена!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

