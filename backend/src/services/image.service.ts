import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { moySkladAPI } from './moysklad.api';

/**
 * Сервис для работы с изображениями
 */
export class ImageService {
  private uploadsDir: string;

  constructor() {
    // Используем переменную окружения или дефолтный путь
    this.uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads/products');
    this.ensureUploadsDirExists();
  }

  /**
   * Создать директорию для загрузок, если не существует
   */
  private async ensureUploadsDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      logger.info(`Директория для изображений: ${this.uploadsDir}`);
    } catch (error) {
      logger.error('Ошибка создания директории для изображений:', error);
    }
  }

  /**
   * Сгенерировать уникальное имя файла на основе URL
   */
  private generateFileName(url: string, originalName?: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = originalName
      ? path.extname(originalName)
      : path.extname(new URL(url).pathname) || '.jpg';
    return `${hash}${ext}`;
  }

  /**
   * Скачать и сохранить изображение из МойСклад с повторными попытками
   * @returns Относительный путь к сохраненному файлу
   */
  async downloadAndSaveImage(imageUrl: string, originalName?: string): Promise<string> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Генерируем уникальное имя файла
        const fileName = this.generateFileName(imageUrl, originalName);
        const filePath = path.join(this.uploadsDir, fileName);

        // Проверяем, существует ли уже файл
        try {
          await fs.access(filePath);
          logger.debug(`Изображение уже существует: ${fileName}`);
          return `/uploads/products/${fileName}`;
        } catch {
          // Файл не существует, продолжаем скачивание
        }

        // Скачиваем изображение
        const imageBuffer = await moySkladAPI.downloadImage(imageUrl);

        // Сохраняем файл
        await fs.writeFile(filePath, imageBuffer);
        logger.debug(`Изображение сохранено: ${fileName}`);

        return `/uploads/products/${fileName}`;
      } catch (error: any) {
        lastError = error;

        // Если это таймаут и не последняя попытка - повторяем
        if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
          if (attempt < maxRetries) {
            logger.warn(`Таймаут загрузки изображения ${imageUrl}, попытка ${attempt}/${maxRetries}`);
            // Ждем перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }

        // Для других ошибок или последней попытки - прерываем
        break;
      }
    }

    logger.error(`Не удалось скачать изображение ${imageUrl} после ${maxRetries} попыток`);
    throw lastError;
  }

  /**
   * Скачать и сохранить несколько изображений
   * @returns Массив относительных путей к сохраненным файлам
   */
  async downloadAndSaveImages(imageUrls: string[]): Promise<string[]> {
    const savedPaths: string[] = [];
    let timeoutCount = 0;

    for (const url of imageUrls) {
      try {
        const savedPath = await this.downloadAndSaveImage(url);
        savedPaths.push(savedPath);
      } catch (error: any) {
        // Подсчитываем таймауты
        if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
          timeoutCount++;
          logger.warn(`Таймаут загрузки изображения ${url.substring(0, 50)}... (пропускаем)`);
        } else {
          logger.error(`Не удалось скачать изображение ${url.substring(0, 50)}...`);
        }
        // Продолжаем скачивание остальных изображений
      }
    }

    if (timeoutCount > 0) {
      logger.warn(`Пропущено ${timeoutCount} изображений из-за таймаутов`);
    }

    return savedPaths;
  }

  /**
   * Удалить изображение по пути
   */
  async deleteImage(imagePath: string): Promise<void> {
    try {
      const fileName = path.basename(imagePath);
      const filePath = path.join(this.uploadsDir, fileName);

      await fs.unlink(filePath);
      logger.debug(`Изображение удалено: ${fileName}`);
    } catch (error) {
      logger.error(`Ошибка удаления изображения ${imagePath}:`, error);
    }
  }

  /**
   * Удалить несколько изображений
   */
  async deleteImages(imagePaths: string[]): Promise<void> {
    for (const imagePath of imagePaths) {
      await this.deleteImage(imagePath);
    }
  }

  /**
   * Очистить старые неиспользуемые изображения
   */
  async cleanupUnusedImages(usedImagePaths: string[]): Promise<void> {
    try {
      const allFiles = await fs.readdir(this.uploadsDir);
      const usedFileNames = usedImagePaths.map((p) => path.basename(p));

      for (const file of allFiles) {
        if (!usedFileNames.includes(file)) {
          const filePath = path.join(this.uploadsDir, file);
          await fs.unlink(filePath);
          logger.debug(`Удалено неиспользуемое изображение: ${file}`);
        }
      }

      logger.info('Очистка неиспользуемых изображений завершена');
    } catch (error) {
      logger.error('Ошибка очистки неиспользуемых изображений:', error);
    }
  }
}

// Экспорт singleton instance
export const imageService = new ImageService();
