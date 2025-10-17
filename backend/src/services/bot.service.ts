import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://vapekhv.live';

if (!BOT_TOKEN) {
  logger.error('❌ TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Создаём экземпляр бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Инициализация бота
export const initBot = () => {
  logger.info('🤖 Инициализация Telegram бота...');

  // Обработчик команды /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'друг';

    try {
      // Отправляем приветственное сообщение с инлайн кнопкой webapp
      await bot.sendMessage(
        chatId,
        `👋 Привет, ${firstName}!\n\n` +
          `Добро пожаловать в <b>VapeKHV</b> - ваш магазин вейпов в Telegram!\n\n` +
          `🛍️ Нажмите кнопку ниже, чтобы открыть каталог и сделать заказ.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🛍️ Открыть магазин',
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
          },
        }
      );

      logger.info(`✅ Пользователь ${firstName} (ID: ${msg.from?.id}) запустил бота`);
    } catch (error) {
      logger.error('Ошибка при обработке команды /start:', error);
      await bot.sendMessage(
        chatId,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.'
      );
    }
  });

  // Обработчик команды /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      await bot.sendMessage(
        chatId,
        `ℹ️ <b>Помощь - VapeKHV</b>\n\n` +
          `<b>Доступные команды:</b>\n` +
          `/start - Запустить бота и открыть магазин\n` +
          `/help - Показать это сообщение\n\n` +
          `<b>Как сделать заказ:</b>\n` +
          `1. Нажмите на кнопку "Открыть магазин"\n` +
          `2. Выберите товары из каталога\n` +
          `3. Добавьте их в корзину\n` +
          `4. Оформите заказ\n\n` +
          `По всем вопросам обращайтесь к @support`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🛍️ Открыть магазин',
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      logger.error('Ошибка при обработке команды /help:', error);
    }
  });

  // Обработчик всех остальных сообщений
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Пропускаем команды, чтобы не дублировать ответы
    if (msg.text?.startsWith('/')) {
      return;
    }

    try {
      await bot.sendMessage(
        chatId,
        `Используйте команду /start для открытия магазина или /help для помощи.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🛍️ Открыть магазин',
                  web_app: { url: WEBAPP_URL },
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      logger.error('Ошибка при обработке сообщения:', error);
    }
  });

  // Обработка ошибок бота
  bot.on('polling_error', (error) => {
    logger.error('Ошибка polling бота:', error);
  });

  logger.info('✅ Telegram бот успешно запущен');
};

// Функция для остановки бота
export const stopBot = async () => {
  try {
    await bot.stopPolling();
    logger.info('🛑 Telegram бот остановлен');
  } catch (error) {
    logger.error('Ошибка при остановке бота:', error);
  }
};

export default bot;

