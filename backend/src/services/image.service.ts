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
    this.uploadsDir = path.join(__dirname, '../../uploads/products');
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
   * Скачать и сохранить изображение из МойСклад
   * @returns Относительный путь к сохраненному файлу
   */
  async downloadAndSaveImage(imageUrl: string, originalName?: string): Promise<string> {
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
    } catch (error) {
      logger.error(`Ошибка скачивания изображения ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Скачать и сохранить несколько изображений
   * @returns Массив относительных путей к сохраненным файлам
   */
  async downloadAndSaveImages(imageUrls: string[]): Promise<string[]> {
    const savedPaths: string[] = [];

    for (const url of imageUrls) {
      try {
        const savedPath = await this.downloadAndSaveImage(url);
        savedPaths.push(savedPath);
      } catch (error) {
        logger.error(`Не удалось скачать изображение ${url}:`, error);
        // Продолжаем скачивание остальных изображений
      }
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
