import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';
import { syncService } from './sync.service';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://vapekhv.live';

// Список ID админов (можно вынести в .env как ADMIN_CHAT_IDS=123,456,789)
const ADMIN_CHAT_IDS = process.env.ADMIN_CHAT_IDS
  ? process.env.ADMIN_CHAT_IDS.split(',').map((id) => parseInt(id.trim()))
  : [];

const isAdmin = (chatId: number): boolean => {
  return ADMIN_CHAT_IDS.includes(chatId);
};

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
      let helpText = `ℹ️ <b>Помощь - VapeKHV</b>\n\n` +
        `<b>Доступные команды:</b>\n` +
        `/start - Запустить бота и открыть магазин\n` +
        `/help - Показать это сообщение\n\n` +
        `<b>Как сделать заказ:</b>\n` +
        `1. Нажмите на кнопку "Открыть магазин"\n` +
        `2. Выберите товары из каталога\n` +
        `3. Добавьте их в корзину\n` +
        `4. Оформите заказ\n\n` +
        `По всем вопросам обращайтесь к @support`;

      // Добавляем админские команды для администраторов
      if (isAdmin(chatId)) {
        helpText += `\n\n<b>Админ команды:</b>\n` +
          `/sync - Запустить синхронизацию с МойСклад`;
      }

      await bot.sendMessage(
        chatId,
        helpText,
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

  // Обработчик команды /sync (только для админов)
  bot.onText(/\/sync/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const userName = msg.from?.username || msg.from?.first_name || 'Unknown';

    // Проверка прав админа
    if (!isAdmin(chatId)) {
      logger.warn(`⚠️ Неавторизованная попытка запуска синхронизации от ${userName} (ID: ${userId})`);
      await bot.sendMessage(
        chatId,
        '❌ У вас нет доступа к этой команде.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    try {
      // Отправляем сообщение о начале синхронизации
      const statusMessage = await bot.sendMessage(
        chatId,
        '🔄 <b>Синхронизация с МойСклад</b>\n\n' +
          'Запускаю синхронизацию каталога...\n' +
          'Это может занять несколько минут.',
        { parse_mode: 'HTML' }
      );

      logger.info(`🔧 Ручной запуск синхронизации от ${userName} (ID: ${userId})`);

      // Запускаем синхронизацию
      const startTime = Date.now();
      await syncService.syncCatalog();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Обновляем сообщение с результатом
      await bot.editMessageText(
        '✅ <b>Синхронизация завершена!</b>\n\n' +
          `⏱️ Время выполнения: ${duration}с\n` +
          `📦 Каталог товаров обновлен\n\n` +
          `Запущено: ${userName}`,
        {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: 'HTML',
        }
      );

      logger.info(`✅ Синхронизация завершена успешно (${duration}с)`);
    } catch (error) {
      logger.error('❌ Ошибка при ручной синхронизации:', error);

      await bot.sendMessage(
        chatId,
        '❌ <b>Ошибка синхронизации</b>\n\n' +
          'Не удалось выполнить синхронизацию.\n' +
          'Проверьте логи сервера для подробностей.\n\n' +
          `<code>${error instanceof Error ? error.message : 'Неизвестная ошибка'}</code>`,
        { parse_mode: 'HTML' }
      );
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

