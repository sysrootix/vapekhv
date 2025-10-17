import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { moySkladAPI } from './moysklad.api';
import { imageService } from './image.service';
import { MoySkladProductFolder, MoySkladProduct, MoySkladVariant } from '../types/moysklad.types';

const prisma = new PrismaClient();

/**
 * Сервис синхронизации каталога с МойСклад
 */
export class SyncService {
  private isSyncing = false;

  /**
   * Главный метод синхронизации
   */
  async syncCatalog(): Promise<void> {
    if (this.isSyncing) {
      logger.warn('Синхронизация уже выполняется, пропускаем...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.info('🔄 Начало синхронизации с МойСклад');

      // 1. Синхронизация категорий
      await this.syncCategories();

      // 2. Синхронизация товаров
      await this.syncProducts();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Синхронизация завершена за ${duration}с`);
    } catch (error) {
      logger.error('❌ Ошибка синхронизации:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Синхронизация категорий
   */
  private async syncCategories(): Promise<void> {
    try {
      logger.info('Синхронизация категорий...');

      const msFolders = await moySkladAPI.getProductFolders();
      let syncedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const msFolder of msFolders) {
        await this.syncCategory(msFolder);
        syncedCount++;

        // Определяем, создана или обновлена категория
        const existingCategory = await prisma.category.findUnique({
          where: { moySkladId: msFolder.id },
        });

        if (existingCategory) {
          updatedCount++;
        } else {
          createdCount++;
        }
      }

      logger.info(
        `Категории синхронизированы: ${syncedCount} (создано: ${createdCount}, обновлено: ${updatedCount})`
      );
    } catch (error) {
      logger.error('Ошибка синхронизации категорий:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать одну категорию
   */
  private async syncCategory(msFolder: MoySkladProductFolder): Promise<void> {
    try {
      const slug = this.generateSlug(msFolder.name);

      // Скачать изображение категории, если есть
      let imageUrl: string | null = null;
      if (msFolder.image?.meta?.downloadHref) {
        try {
          imageUrl = await imageService.downloadAndSaveImage(
            msFolder.image.meta.downloadHref,
            msFolder.name
          );
        } catch (error) {
          logger.warn(`Не удалось скачать изображение для категории ${msFolder.name}`);
        }
      }

      // Создать или обновить категорию
      await prisma.category.upsert({
        where: { moySkladId: msFolder.id },
        create: {
          moySkladId: msFolder.id,
          name: msFolder.name,
          slug,
          description: msFolder.description || null,
          imageUrl,
          isActive: !msFolder.archived,
          moySkladUpdated: msFolder.updated ? new Date(msFolder.updated) : new Date(),
        },
        update: {
          name: msFolder.name,
          description: msFolder.description || null,
          imageUrl: imageUrl || undefined,
          isActive: !msFolder.archived,
          moySkladUpdated: msFolder.updated ? new Date(msFolder.updated) : new Date(),
        },
      });

      logger.debug(`Категория синхронизирована: ${msFolder.name}`);
    } catch (error) {
      logger.error(`Ошибка синхронизации категории ${msFolder.name}:`, error);
    }
  }

  /**
   * Синхронизация товаров (в обратном порядке - сначала новые)
   */
  private async syncProducts(): Promise<void> {
    try {
      logger.info('Синхронизация товаров...');

      const msProducts = await moySkladAPI.getProducts();

      // Реверсируем массив, чтобы синхронизировать сначала новые товары (сверху)
      const productsReversed = [...msProducts].reverse();

      let syncedCount = 0;

      for (const msProduct of productsReversed) {
        await this.syncProduct(msProduct);
        syncedCount++;

        // Прогресс каждые 10 товаров
        if (syncedCount % 10 === 0) {
          logger.info(`Синхронизировано товаров: ${syncedCount}/${msProducts.length}`);
        }
      }

      logger.info(`Товары синхронизированы: ${syncedCount}`);
    } catch (error) {
      logger.error('Ошибка синхронизации товаров:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать один товар
   */
  private async syncProduct(msProduct: MoySkladProduct): Promise<void> {
    try {
      // Получить категорию товара
      let categoryId: string | null = null;
      if (msProduct.productFolder?.meta?.href) {
        const msFolderId = this.extractIdFromHref(msProduct.productFolder.meta.href);
        const category = await prisma.category.findUnique({
          where: { moySkladId: msFolderId },
        });

        if (category) {
          categoryId = category.id;
        } else {
          logger.warn(`Категория не найдена для товара ${msProduct.name}`);
          return; // Пропускаем товар без категории
        }
      } else {
        logger.warn(`Товар ${msProduct.name} не имеет категории, пропускаем`);
        return;
      }

      const slug = this.generateSlug(msProduct.name);

      // Получить остатки товара
      const stock = await moySkladAPI.getProductStock(msProduct.id);

      // Получить цену товара
      const price = msProduct.salePrices && msProduct.salePrices.length > 0
        ? msProduct.salePrices[0].value / 100 // МойСклад хранит цены в копейках
        : 0;

      // Скачать изображения товара (с обработкой таймаутов)
      let imageUrl: string | null = null;
      let images: string[] = [];

      if (msProduct.images?.meta?.href) {
        try {
          const msImages = await moySkladAPI.getProductImages(msProduct.id);
          if (msImages.length > 0) {
            const imageUrls = msImages
              .filter((img) => img.meta?.downloadHref)
              .map((img) => img.meta.downloadHref!);

            // Скачиваем изображения, пропускаем те, что не удалось загрузить
            images = await imageService.downloadAndSaveImages(imageUrls);
            imageUrl = images[0] || null;

            if (images.length > 0) {
              logger.debug(`Загружено ${images.length} изображений для товара ${msProduct.name}`);
            }
          }
        } catch (error: any) {
          // Не прерываем синхронизацию при ошибках загрузки изображений
          const errorMsg = error.response?.status === 504 ? 'таймаут' : 'ошибка';
          logger.warn(`Не удалось скачать изображения для товара ${msProduct.name} (${errorMsg})`);
        }
      }

      // Создать или обновить товар
      await prisma.product.upsert({
        where: { moySkladId: msProduct.id },
        create: {
          moySkladId: msProduct.id,
          name: msProduct.name,
          slug,
          description: msProduct.description || null,
          price,
          imageUrl,
          images,
          inStock: stock.quantity > 0,
          stockCount: stock.quantity,
          isActive: !msProduct.archived,
          categoryId,
          article: msProduct.article || null,
          code: msProduct.code || null,
          externalCode: msProduct.externalCode || null,
          moySkladUpdated: msProduct.updated ? new Date(msProduct.updated) : new Date(),
        },
        update: {
          name: msProduct.name,
          description: msProduct.description || null,
          price,
          imageUrl: imageUrl || undefined,
          images,
          inStock: stock.quantity > 0,
          stockCount: stock.quantity,
          isActive: !msProduct.archived,
          categoryId,
          article: msProduct.article || null,
          code: msProduct.code || null,
          externalCode: msProduct.externalCode || null,
          moySkladUpdated: msProduct.updated ? new Date(msProduct.updated) : new Date(),
        },
      });

      // Синхронизировать варианты товара
      await this.syncProductVariants(msProduct.id);

      logger.debug(`Товар синхронизирован: ${msProduct.name}`);
    } catch (error) {
      logger.error(`Ошибка синхронизации товара ${msProduct.name}:`, error);
    }
  }

  /**
   * Синхронизировать варианты товара
   */
  private async syncProductVariants(msProductId: string): Promise<void> {
    try {
      const msVariants = await moySkladAPI.getProductVariants(msProductId);

      for (const msVariant of msVariants) {
        await this.syncVariant(msVariant, msProductId);
      }
    } catch (error) {
      logger.error(`Ошибка синхронизации вариантов товара ${msProductId}:`, error);
    }
  }

  /**
   * Синхронизировать один вариант товара
   */
  private async syncVariant(msVariant: MoySkladVariant, msProductId: string): Promise<void> {
    try {
      // Найти товар в БД
      const product = await prisma.product.findUnique({
        where: { moySkladId: msProductId },
      });

      if (!product) {
        logger.warn(`Товар не найден для варианта ${msVariant.name}`);
        return;
      }

      // Получить остатки из варианта (если был expand=stock) или из полей напрямую
      const stockCount = msVariant.quantity || msVariant.stock || 0;

      // Получить цену варианта
      const price = msVariant.salePrices && msVariant.salePrices.length > 0
        ? msVariant.salePrices[0].value / 100
        : null;

      // Преобразовать характеристики варианта в JSON
      const characteristics: Record<string, string> = {};
      if (msVariant.characteristics) {
        for (const char of msVariant.characteristics) {
          characteristics[char.name] = char.value;
        }
      }

      // Создать или обновить вариант
      await prisma.productVariant.upsert({
        where: { moySkladId: msVariant.id },
        create: {
          moySkladId: msVariant.id,
          sku: msVariant.code || null,
          price,
          stockCount,
          inStock: stockCount > 0,
          characteristics,
          productId: product.id,
          moySkladUpdated: msVariant.updated ? new Date(msVariant.updated) : new Date(),
        },
        update: {
          sku: msVariant.code || null,
          price,
          stockCount,
          inStock: stockCount > 0,
          characteristics,
          moySkladUpdated: msVariant.updated ? new Date(msVariant.updated) : new Date(),
        },
      });

      logger.debug(`Вариант синхронизирован: ${msVariant.name} (остатки: ${stockCount})`);
    } catch (error) {
      logger.error(`Ошибка синхронизации варианта ${msVariant.name}:`, error);
    }
  }

  /**
   * Извлечь ID из href МойСклад
   */
  private extractIdFromHref(href: string): string {
    const parts = href.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Сгенерировать slug из названия
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

// Экспорт singleton instance
export const syncService = new SyncService();
