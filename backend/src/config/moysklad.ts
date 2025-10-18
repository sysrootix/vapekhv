import dotenv from 'dotenv';

dotenv.config();

export const moySkladConfig = {
  apiUrl: process.env.MOYSKLAD_API_URL || 'https://api.moysklad.ru/api/remap/1.2',
  token: process.env.MOYSKLAD_TOKEN || '',
  organizationId: process.env.MOYSKLAD_ORGANIZATION_ID || '', // ID нашей организации в МойСклад
  storeId: process.env.MOYSKLAD_STORE_ID || '', // ID склада в МойСклад
  syncIntervalMinutes: 30, // Синхронизация каждые 30 минут

  // Лимиты API
  maxLimit: 1000, // Максимальное количество элементов за запрос
  expandLimit: 100, // Максимум при использовании expand

  // Настройки запросов
  timeout: 30000, // 30 секунд
  retries: 3, // Количество повторов при ошибке
};

// Валидация конфигурации
export function validateMoySkladConfig(): void {
  if (!moySkladConfig.token) {
    throw new Error('MOYSKLAD_TOKEN не установлен в переменных окружения');
  }
  if (!moySkladConfig.organizationId) {
    throw new Error('MOYSKLAD_ORGANIZATION_ID не установлен в переменных окружения');
  }
  if (!moySkladConfig.storeId) {
    throw new Error('MOYSKLAD_STORE_ID не установлен в переменных окружения');
  }
}
