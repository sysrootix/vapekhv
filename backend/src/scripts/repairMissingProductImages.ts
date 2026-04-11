import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { imageService } from '../services/image.service';
import { moySkladAPI } from '../services/moysklad.api';
import { logger } from '../config/logger';

dotenv.config();

const prisma = new PrismaClient();

async function hasFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      moySkladId: { not: null },
      imageUrl: { not: null },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      images: true,
      moySkladId: true,
    },
  });

  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'backend/uploads/products');
  let repaired = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const currentImage = product.imageUrl;
    if (!currentImage) {
      skipped++;
      continue;
    }

    const currentFile = path.join(uploadsDir, path.basename(currentImage));
    if (await hasFile(currentFile)) {
      skipped++;
      continue;
    }

    if (!product.moySkladId) {
      skipped++;
      continue;
    }

    try {
      const msImages = await moySkladAPI.getProductImages(product.moySkladId);
      const imageUrls = msImages
        .filter((img) => img.meta?.downloadHref)
        .map((img) => img.meta.downloadHref as string);

      if (imageUrls.length === 0) {
        logger.warn(`У товара ${product.name} нет доступных изображений в МойСклад`);
        failed++;
        continue;
      }

      const savedImages = await imageService.downloadAndSaveImages(imageUrls);
      if (savedImages.length === 0) {
        logger.warn(`Не удалось скачать изображения для товара ${product.name}`);
        failed++;
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl: savedImages[0],
          images: savedImages,
        },
      });

      repaired++;
      logger.info(`Исправлено изображение товара: ${product.name}`);
    } catch (error) {
      failed++;
      logger.error(`Ошибка восстановления изображения товара ${product.name}:`, error);
    }
  }

  logger.info(`Готово. Исправлено: ${repaired}, пропущено: ${skipped}, ошибок: ${failed}`);
}

main()
  .catch((error) => {
    logger.error('Скрипт восстановления изображений завершился с ошибкой:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
