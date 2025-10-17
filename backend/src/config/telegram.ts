import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false, // Мы используем только API, не нужен polling
});

// Валидация Telegram InitData
export const validateTelegramWebAppData = (initData: string): boolean => {
  try {
    // Здесь должна быть полная валидация через хеш
    // Пока упрощенная версия
    const params = new URLSearchParams(initData);
    return params.has('user') || params.has('query_id');
  } catch (error) {
    logger.error('Telegram data validation error:', error);
    return false;
  }
};

// Парсинг данных пользователя из InitData
export const parseTelegramUser = (initData: string) => {
  try {
    const params = new URLSearchParams(initData);
    const userString = params.get('user');
    
    if (!userString) {
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userString));
    return user;
  } catch (error) {
    logger.error('Error parsing Telegram user:', error);
    return null;
  }
};

export { bot };

