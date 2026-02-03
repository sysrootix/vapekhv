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
  MoySkladCustomerOrder,
  MoySkladCounterparty,
  MoySkladCreateCounterpartyRequest,
  MoySkladDemand,
  MoySkladCashIn,
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

  /**
   * Создать Заказ покупателя в МойСклад
   */
  async createCustomerOrder(order: MoySkladCustomerOrder): Promise<MoySkladCustomerOrder> {
    try {
      const response = await this.client.post<MoySkladCustomerOrder>('/entity/customerorder', order);
      logger.info(`Заказ покупателя ${order.name} успешно создан в МойСклад`);
      return response.data;
    } catch (error) {
      logger.error('Ошибка создания Заказа покупателя в МойСклад:', error);
      throw error;
    }
  }

  /**
   * Найти контрагента по телефону (использует search)
   */
  async findCounterpartyByPhone(phone?: string): Promise<MoySkladCounterparty | null> {
    if (!phone) {
      return null;
    }

    try {
      const normalized = phone.replace(/\D/g, '');
      if (!normalized) {
        return null;
      }

      const response = await this.client.get<MoySkladListResponse<MoySkladCounterparty>>(
        '/entity/counterparty',
        {
          params: {
            search: normalized,
            limit: 1,
          },
        }
      );

      const counterparty = response.data.rows?.[0];
      if (counterparty) {
        logger.debug(`Найден контрагент ${counterparty.name} для телефона ${phone}`);
        return counterparty;
      }

      return null;
    } catch (error) {
      logger.error('Ошибка поиска контрагента в МойСклад:', error);
      return null;
    }
  }

  /**
   * Создать нового контрагента
   */
  async createCounterparty(data: MoySkladCreateCounterpartyRequest): Promise<MoySkladCounterparty> {
    try {
      const response = await this.client.post<MoySkladCounterparty>('/entity/counterparty', data);
      logger.info(`Создан новый контрагент в МойСклад: ${response.data.name}`);
      return response.data;
    } catch (error) {
      logger.error('Ошибка создания контрагента в МойСклад:', error);
      throw error;
    }
  }

  /**
   * Создать отгрузку (Demand) для списания остатков
   */
  async createDemand(demand: MoySkladDemand): Promise<MoySkladDemand> {
    try {
      const response = await this.client.post<MoySkladDemand>('/entity/demand', demand);
      logger.info(`Отгрузка ${demand.name || demand.customerOrder?.meta?.href || ''} создана в МойСклад`);
      return response.data;
    } catch (error) {
      logger.error('Ошибка создания отгрузки в МойСклад:', error);
      throw error;
    }
  }

  /**
   * Создать приходный кассовый ордер (CashIn) для фиксации оплаты наличными
   */
  async createCashIn(cashIn: MoySkladCashIn): Promise<MoySkladCashIn> {
    try {
      const response = await this.client.post<MoySkladCashIn>('/entity/cashin', cashIn);
      logger.info(`Оплата наличными зафиксирована в МойСклад (сумма: ${cashIn.sum / 100} ₽)`);
      return response.data;
    } catch (error) {
      logger.error('Ошибка создания кассового ордера в МойСклад:', error);
      throw error;
    }
  }
  /**
   * Найти сущность по имени (для очистки дублей)
   */
  async findEntityByName<T>(type: string, name: string): Promise<T | null> {
    try {
      const response = await this.client.get<MoySkladListResponse<T>>(`/entity/${type}`, {
        params: {
          filter: `name=${name}`,
          limit: 1,
        },
      });

      return response.data.rows?.[0] || null;
    } catch (error) {
      logger.error(`Ошибка поиска сущности ${type} с именем ${name}:`, error);
      return null;
    }
  }

  /**
   * Удалить сущность по ID
   */
  async deleteEntity(type: string, id: string): Promise<void> {
    try {
      await this.client.delete(`/entity/${type}/${id}`);
      logger.info(`Сущность ${type}/${id} удалена из МойСклад`);
    } catch (error) {
      logger.error(`Ошибка удаления сущности ${type}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Найти заказ покупателя по номеру заказа (name)
   */
  async findCustomerOrderByName(orderNumber: string): Promise<MoySkladCustomerOrder | null> {
    try {
      const response = await this.client.get<MoySkladListResponse<MoySkladCustomerOrder>>(
        '/entity/customerorder',
        {
          params: {
            filter: `name=${orderNumber}`,
            limit: 1,
          },
        }
      );

      const order = response.data.rows?.[0];
      if (order) {
        logger.debug(`Найден заказ покупателя ${orderNumber} в МойСклад (ID: ${order.id})`);
        return order;
      }

      return null;
    } catch (error) {
      logger.error(`Ошибка поиска заказа покупателя ${orderNumber}:`, error);
      return null;
    }
  }

  /**
   * Найти все отгрузки (demands), связанные с заказом покупателя
   */
  async findDemandsByCustomerOrder(customerOrderId: string): Promise<MoySkladDemand[]> {
    try {
      const response = await this.client.get<MoySkladListResponse<MoySkladDemand>>(
        '/entity/demand',
        {
          params: {
            filter: `customerOrder=https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${customerOrderId}`,
          },
        }
      );

      logger.debug(`Найдено ${response.data.rows.length} отгрузок для заказа ${customerOrderId}`);
      return response.data.rows;
    } catch (error) {
      logger.error(`Ошибка поиска отгрузок для заказа ${customerOrderId}:`, error);
      return [];
    }
  }

  /**
   * Найти все приходные ордера (cashin), связанные с отгрузкой или заказом
   */
  async findCashInByDocument(documentType: 'demand' | 'customerorder', documentId: string): Promise<MoySkladCashIn[]> {
    try {
      // Получаем все cashin и фильтруем по operations
      const response = await this.client.get<MoySkladListResponse<MoySkladCashIn>>(
        '/entity/cashin',
        {
          params: {
            limit: 100,
            expand: 'operations',
          },
        }
      );

      // Фильтруем cashin, которые содержат ссылку на наш документ в operations
      const documentUrl = `https://api.moysklad.ru/api/remap/1.2/entity/${documentType}/${documentId}`;
      const relatedCashIns = response.data.rows.filter((cashIn: any) => {
        if (!cashIn.operations) return false;
        return cashIn.operations.some((op: any) => op.meta?.href === documentUrl);
      });

      logger.debug(`Найдено ${relatedCashIns.length} приходных ордеров для ${documentType}/${documentId}`);
      return relatedCashIns;
    } catch (error) {
      logger.error(`Ошибка поиска приходных ордеров для ${documentType}/${documentId}:`, error);
      return [];
    }
  }

  /**
   * Удалить заказ и все связанные документы из МойСклад
   * Удаляет в правильном порядке: cashin -> demand -> customerorder
   */
  async deleteOrderWithRelatedDocuments(orderNumber: string): Promise<{
    success: boolean;
    deletedCashIns: number;
    deletedDemands: number;
    deletedOrder: boolean;
    message: string;
  }> {
    try {
      // 1. Найти заказ покупателя
      const customerOrder = await this.findCustomerOrderByName(orderNumber);
      
      if (!customerOrder || !customerOrder.id) {
        logger.info(`Заказ ${orderNumber} не найден в МойСклад, пропускаем удаление`);
        return {
          success: true,
          deletedCashIns: 0,
          deletedDemands: 0,
          deletedOrder: false,
          message: 'Заказ не найден в МойСклад',
        };
      }

      logger.info(`Начинаю удаление заказа ${orderNumber} из МойСклад...`);

      let deletedCashIns = 0;
      let deletedDemands = 0;

      // 2. Найти все отгрузки
      const demands = await this.findDemandsByCustomerOrder(customerOrder.id);

      // 3. Для каждой отгрузки найти и удалить связанные cashin
      for (const demand of demands) {
        if (!demand.id) continue;

        const cashIns = await this.findCashInByDocument('demand', demand.id);
        
        for (const cashIn of cashIns) {
          if (!cashIn.id) continue;
          
          try {
            await this.deleteEntity('cashin', cashIn.id);
            deletedCashIns++;
          } catch (error) {
            logger.warn(`Не удалось удалить cashin ${cashIn.id}:`, error);
          }
        }
      }

      // 4. Найти cashin, связанные напрямую с заказом (если есть)
      const orderCashIns = await this.findCashInByDocument('customerorder', customerOrder.id);
      for (const cashIn of orderCashIns) {
        if (!cashIn.id) continue;
        
        try {
          await this.deleteEntity('cashin', cashIn.id);
          deletedCashIns++;
        } catch (error) {
          logger.warn(`Не удалось удалить cashin ${cashIn.id}:`, error);
        }
      }

      // 5. Удалить все отгрузки
      for (const demand of demands) {
        if (!demand.id) continue;
        
        try {
          await this.deleteEntity('demand', demand.id);
          deletedDemands++;
        } catch (error) {
          logger.warn(`Не удалось удалить demand ${demand.id}:`, error);
        }
      }

      // 6. Удалить заказ покупателя
      await this.deleteEntity('customerorder', customerOrder.id);

      const message = `Удалено из МойСклад: ${deletedCashIns} оплат, ${deletedDemands} отгрузок, 1 заказ`;
      logger.info(`Заказ ${orderNumber} успешно удален из МойСклад. ${message}`);

      return {
        success: true,
        deletedCashIns,
        deletedDemands,
        deletedOrder: true,
        message,
      };
    } catch (error) {
      logger.error(`Ошибка при удалении заказа ${orderNumber} из МойСклад:`, error);
      return {
        success: false,
        deletedCashIns: 0,
        deletedDemands: 0,
        deletedOrder: false,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

}

// Экспорт singleton instance
export const moySkladAPI = new MoySkladAPI();
