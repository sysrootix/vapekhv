import axios, { AxiosInstance } from 'axios';
import { moySkladConfig } from '../config/moysklad';
import { logger } from '../config/logger';
import {
  MoySkladListResponse,
  MoySkladProductFolder,
  MoySkladProduct,
  MoySkladVariant,
  MoySkladImage,
  MoySkladError,
} from '../types/moysklad.types';

/**
 * API клиент для работы с МойСклад
 */
export class MoySkladAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: moySkladConfig.apiUrl,
      timeout: moySkladConfig.timeout,
      headers: {
        'Authorization': `Bearer ${moySkladConfig.token}`,
        'Content-Type': 'application/json',
      },
    });

    // Логирование запросов
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`МойСклад API запрос: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Ошибка запроса к МойСклад API:', error);
        return Promise.reject(error);
      }
    );

    // Обработка ответов и ошибок
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (error.response) {
          const msError = error.response.data as MoySkladError;
          logger.error('Ошибка МойСклад API:', {
            status: error.response.status,
            errors: msError.errors,
          });
        } else {
          logger.error('Ошибка сети при запросе к МойСклад:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Получить все категории товаров (ProductFolder)
   */
  async getProductFolders(): Promise<MoySkladProductFolder[]> {
    try {
      const allFolders: MoySkladProductFolder[] = [];
      let offset = 0;
      const limit = moySkladConfig.maxLimit;

      while (true) {
        const response = await this.client.get<MoySkladListResponse<MoySkladProductFolder>>(
          '/entity/productfolder',
          {
            params: {
              limit,
              offset,
            },
          }
        );

        allFolders.push(...response.data.rows);

        if (response.data.rows.length < limit) {
          break; // Больше нет данных
        }

        offset += limit;
      }

      logger.info(`Получено ${allFolders.length} категорий из МойСклад`);
      return allFolders;
    } catch (error) {
      logger.error('Ошибка получения категорий из МойСклад:', error);
      throw error;
    }
  }

  /**
   * Получить ассортимент (товары и модификации) с остатками
   * Использует /entity/assortment для более эффективного получения данных
   */
  async getAssortment(): Promise<any[]> {
    try {
      const allItems: any[] = [];
      let offset = 0;
      const limit = moySkladConfig.maxLimit;

      while (true) {
        const response = await this.client.get<MoySkladListResponse<any>>(
          '/entity/assortment',
          {
            params: {
              limit,
              offset,
              groupBy: 'variant', // Товары и модификации с остатками
              filter: 'archived=false', // Только неархивированные
            },
          }
        );

        allItems.push(...response.data.rows);

        if (response.data.rows.length < limit) {
          break;
        }

        offset += limit;
      }

      logger.info(`Получено ${allItems.length} позиций ассортимента из МойСклад`);
      return allItems;
    } catch (error) {
      logger.error('Ошибка получения ассортимента из МойСклад:', error);
      throw error;
    }
  }

  /**
   * Получить все остатки (товары и варианты) включая нулевые
   * Использует report/stock/all/current с параметром include=zeroLines
   * Возвращает простой массив [{assortmentId, stock}]
   */
  async getAllStocks(): Promise<Map<string, { stock: number; reserve: number; quantity: number }>> {
    try {
      const stockMap = new Map<string, { stock: number; reserve: number; quantity: number }>();

      // Краткий отчет возвращает простой массив, а не объект с rows
      const response = await this.client.get<Array<{ assortmentId: string; quantity: number }>>(
        '/report/stock/all/current',
        {
          params: {
            include: 'zeroLines', // Включить позиции с нулевыми остатками
            groupBy: 'variant', // Группировка по вариантам
            stockType: 'quantity', // Получить доступное количество
          },
        }
      );

      // response.data - это массив, а не объект с полем rows
      const items = Array.isArray(response.data) ? response.data : [];

      // Заполняем Map с ID -> остатки
      for (const item of items) {
        if (item.assortmentId) {
          const quantity = item.quantity || 0;
          stockMap.set(item.assortmentId, {
            stock: quantity,
            reserve: 0, // Краткий отчет не содержит reserve
            quantity: quantity,
          });

          // Логируем первые 5 записей для отладки
          if (stockMap.size <= 5) {
            logger.debug(`Остаток загружен: id=${item.assortmentId}, quantity=${quantity}`);
          }
        }
      }

      logger.info(`Получено остатков для ${stockMap.size} позиций (включая нулевые)`);
      return stockMap;
    } catch (error) {
      logger.error('Ошибка получения остатков:', error);
      return new Map();
    }
  }

  /**
   * Получить все товары (Product) с остатками
   * @deprecated Используйте getAssortment() для лучшей производительности
   */
  async getProducts(): Promise<MoySkladProduct[]> {
    try {
      const allProducts: MoySkladProduct[] = [];
      let offset = 0;
      const limit = moySkladConfig.maxLimit;

      while (true) {
        const response = await this.client.get<MoySkladListResponse<MoySkladProduct>>(
          '/entity/product',
          {
            params: {
              limit,
              offset,
              filter: 'archived=false', // Только неархивированные товары
            },
          }
        );

        allProducts.push(...response.data.rows);

        if (response.data.rows.length < limit) {
          break;
        }

        offset += limit;
      }

      logger.info(`Получено ${allProducts.length} товаров из МойСклад`);
      return allProducts;
    } catch (error) {
      logger.error('Ошибка получения товаров из МойСклад:', error);
      throw error;
    }
  }

  /**
   * Получить остатки товара по ID
   */
  async getProductStock(productId: string): Promise<{ stock: number; reserve: number; quantity: number }> {
    try {
      const response = await this.client.get(`/report/stock/all`, {
        params: {
          filter: `product=https://api.moysklad.ru/api/remap/1.2/entity/product/${productId}`,
        },
      });

      const stockData = response.data.rows[0] || {};
      return {
        stock: stockData.stock || 0,
        reserve: stockData.reserve || 0,
        quantity: stockData.quantity || 0,
      };
    } catch (error) {
      logger.error(`Ошибка получения остатков товара ${productId}:`);
      return { stock: 0, reserve: 0, quantity: 0 };
    }
  }

  /**
   * Получить ВСЕ модификации (варианты) без фильтрации
   */
  async getAllVariants(): Promise<MoySkladVariant[]> {
    try {
      const allVariants: MoySkladVariant[] = [];
      let offset = 0;
      const limit = moySkladConfig.maxLimit;

      while (true) {
        const response = await this.client.get<MoySkladListResponse<MoySkladVariant>>(
          `/entity/variant`,
          {
            params: {
              limit,
              offset,
            },
          }
        );

        allVariants.push(...response.data.rows);

        if (response.data.rows.length < limit) {
          break;
        }

        offset += limit;
      }

      logger.info(`Получено ${allVariants.length} вариантов из МойСклад`);
      return allVariants;
    } catch (error) {
      logger.error('Ошибка получения вариантов:', error);
      return [];
    }
  }

  /**
   * Получить остатки модификации по ID
   */
  async getVariantStock(variantId: string): Promise<{ stock: number; reserve: number; quantity: number }> {
    try {
      const response = await this.client.get(`/report/stock/all`, {
        params: {
          filter: `variant=https://api.moysklad.ru/api/remap/1.2/entity/variant/${variantId}`,
        },
      });

      const stockData = response.data.rows[0] || {};
      return {
        stock: stockData.stock || 0,
        reserve: stockData.reserve || 0,
        quantity: stockData.quantity || 0,
      };
    } catch (error) {
      logger.error(`Ошибка получения остатков варианта ${variantId}:`);
      return { stock: 0, reserve: 0, quantity: 0 };
    }
  }

  /**
   * Получить изображения товара
   */
  async getProductImages(productId: string): Promise<MoySkladImage[]> {
    try {
      const response = await this.client.get<MoySkladListResponse<MoySkladImage>>(
        `/entity/product/${productId}/images`
      );

      return response.data.rows;
    } catch (error) {
      logger.error(`Ошибка получения изображений товара ${productId}:`, error);
      return [];
    }
  }

  /**
   * Получить изображения модификации
   */
  async getVariantImages(variantId: string): Promise<MoySkladImage[]> {
    try {
      const response = await this.client.get<MoySkladListResponse<MoySkladImage>>(
        `/entity/variant/${variantId}/images`
      );

      return response.data.rows;
    } catch (error) {
      logger.error(`Ошибка получения изображений варианта ${variantId}:`, error);
      return [];
    }
  }

  /**
   * Скачать изображение по URL
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await this.client.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error(`Ошибка скачивания изображения ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Получить информацию о текущем аккаунте (для проверки подключения)
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.get('/context');
      return response.data;
    } catch (error) {
      logger.error('Ошибка получения информации об аккаунте:', error);
      throw error;
    }
  }
}

// Экспорт singleton instance
export const moySkladAPI = new MoySkladAPI();
