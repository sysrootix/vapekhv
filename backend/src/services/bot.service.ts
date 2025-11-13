import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';
import { syncService } from './sync.service';
import { buildReferralLink } from '../utils/referral';
import { referralService } from './referral.service';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const REFERRAL_PAGE_URL = WEBAPP_URL ? `${WEBAPP_URL.replace(/\/$/, '')}/referrals` : null;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

if (!WEBAPP_URL) {
  throw new Error('WEBAPP_URL is not defined in environment variables');
}

// Список ID админов (можно вынести в .env как ADMIN_CHAT_IDS=123,456,789)
const ADMIN_CHAT_IDS = process.env.ADMIN_CHAT_IDS
  ? process.env.ADMIN_CHAT_IDS.split(',').map((id) => parseInt(id.trim()))
  : [];

const CRM_CHAT_IDS = process.env.CRM_CHAT_IDS
  ? process.env.CRM_CHAT_IDS.split(',').map((id) => parseInt(id.trim()))
  : [];

const isAdmin = (chatId: number): boolean => {
  return ADMIN_CHAT_IDS.includes(chatId);
};

const isCrmMember = (chatId: number): boolean => {
  return CRM_CHAT_IDS.includes(chatId);
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
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'друг';
    const isUserAdmin = isAdmin(chatId);
    const isUserCrm = isCrmMember(chatId);
    const startParam = match?.[1]; // Параметр после /start

    try {
      // Если есть параметр product_*, открываем WebApp с этим товаром
      let webAppUrl = WEBAPP_URL;
      if (startParam && startParam.startsWith('product_')) {
        const productId = startParam.replace('product_', '');
        webAppUrl = `${WEBAPP_URL}/product/${productId}`;
      }

      // Формируем кнопки в зависимости от прав пользователя
      const keyboard: any[][] = [
        [
          {
            text: '🛍️ Открыть магазин',
            web_app: { url: webAppUrl },
          },
        ],
      ];

      // Если пользователь админ, добавляем кнопку админ-панели
      if (isUserAdmin) {
        keyboard.push([
          {
            text: '⚙️ Админ-панель',
            web_app: { url: `${WEBAPP_URL}/admin` },
          },
        ]);
      }

      if (isUserCrm) {
        keyboard.push([
          {
            text: '📊 CRM-панель',
            web_app: { url: `${WEBAPP_URL}/crm` },
          },
        ]);
      }

      // Отправляем приветственное сообщение с инлайн кнопками webapp
      let welcomeMessage = `👋 <b>Привет, ${firstName}!</b>\n\n`;
      welcomeMessage += `Добро пожаловать в <b>VapeKHV</b>\n`;
      welcomeMessage += `Ваш магазин вейп-продукции в Telegram!\n\n`;
      welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
      welcomeMessage += `🛍️ Широкий ассортимент товаров\n`;
      welcomeMessage += `⚡️ Быстрая доставка\n`;
      welcomeMessage += `⭐️ Программа лояльности\n`;
      welcomeMessage += `💳 Удобная оплата\n\n`;
      welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
      welcomeMessage += `Нажмите кнопку ниже, чтобы открыть каталог`;

      if (isUserAdmin) {
        welcomeMessage += `\n\n⚙️ <b>Вам доступна админ-панель</b>\nДля управления заказами и товарами`;
      }
      if (isUserCrm) {
        welcomeMessage += `\n\n📊 <b>Вам доступна CRM-панель</b>\nДля аналитики и работы с клиентами`;
      }

      await bot.sendMessage(
        chatId,
        welcomeMessage,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard,
          },
        }
      );

      let accessTag = '';
      if (isUserAdmin) accessTag += ' [ADMIN]';
      if (isUserCrm) accessTag += ' [CRM]';

      logger.info(`✅ Пользователь ${firstName} (ID: ${msg.from?.id}) запустил бота${accessTag}`);
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
      let helpText = `ℹ️ <b>Справка - VapeKHV</b>\n\n`;
      helpText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      helpText += `<b>Доступные команды:</b>\n\n`;
      helpText += `• /start — Запустить бота\n`;
      helpText += `• /help — Справка\n\n`;
      helpText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      helpText += `<b>Как сделать заказ:</b>\n\n`;
      helpText += `<b>1.</b> Нажмите кнопку "Открыть магазин"\n`;
      helpText += `<b>2.</b> Выберите товары из каталога\n`;
      helpText += `<b>3.</b> Добавьте товары в корзину\n`;
      helpText += `<b>4.</b> Перейдите в корзину\n`;
      helpText += `<b>5.</b> Укажите адрес доставки\n`;
      helpText += `<b>6.</b> Оформите и оплатите заказ\n\n`;
      helpText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      helpText += `<b>Программа лояльности:</b>\n\n`;
      helpText += `⭐️ Получайте бонусы за покупки\n`;
      helpText += `💰 Оплачивайте до 50% заказа бонусами\n`;
      helpText += `🎁 Копите бонусы на следующие покупки\n\n`;
      helpText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      helpText += `📞 <b>Поддержка:</b> @vapekhv_admin`;

      // Добавляем админские команды для администраторов
      if (isAdmin(chatId)) {
        helpText += `\n\n━━━━━━━━━━━━━━━━━━━\n\n`;
        helpText += `<b>Команды администратора:</b>\n\n`;
        helpText += `• /sync — Синхронизация с МойСклад`;
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
      let message = `ℹ️ <b>Доступные команды:</b>\n\n`;
      message += `• /start — Открыть магазин\n`;
      message += `• /help — Справка и инструкции\n\n`;
      message += `Нажмите кнопку ниже для быстрого доступа к каталогу`;

      await bot.sendMessage(
        chatId,
        message,
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
      logger.error('Ошибка при обработке сообщения:', error);
    }
  });

  // Обработка ошибок бота
  bot.on('polling_error', (error) => {
    logger.error('Ошибка polling бота:', error);
  });

  logger.info('✅ Telegram бот успешно запущен');
};

export const sendReferralInviteNotification = async (
  telegramId: bigint,
  payload: { inviteeFirstName: string; bonusAmount: number; referralCode?: string | null }
): Promise<void> => {
  try {
    const shareLink = payload.referralCode ? buildReferralLink(payload.referralCode) : null;
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

    if (REFERRAL_PAGE_URL) {
      keyboard.push([
        {
          text: '🎁 Реферальный кабинет',
          web_app: { url: REFERRAL_PAGE_URL },
        },
      ]);
    }

    if (shareLink) {
      keyboard.push([
        {
          text: '🔗 Поделиться ссылкой',
          url: shareLink,
        },
      ]);
    }

    const message = `
👥 <b>Новый реферал</b>

${payload.inviteeFirstName} открыл приложение по вашей ссылке.
Как только он оформит первый заказ, вы получите <b>${payload.bonusAmount}₽</b> бонусов.
    `.trim();

    await bot.sendMessage(Number(telegramId), message, {
      parse_mode: 'HTML',
      reply_markup: keyboard.length
        ? {
            inline_keyboard: keyboard,
          }
        : undefined,
    });
  } catch (error) {
    logger.error(`Ошибка отправки уведомления о новом реферале пользователю ${telegramId}:`, error);
  }
};

export const sendReferralRewardNotification = async (
  telegramId: bigint,
  payload: { inviteeName: string; bonusAmount: number }
): Promise<void> => {
  try {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

    if (REFERRAL_PAGE_URL) {
      keyboard.push([
        {
          text: '🎁 Реферальный кабинет',
          web_app: { url: REFERRAL_PAGE_URL },
        },
      ]);
    }

    const message = `
🎉 <b>Бонус начислен!</b>

${payload.inviteeName} сделал первый заказ.
Ваш баланс пополнен на <b>${payload.bonusAmount}₽</b> бонусов.
    `.trim();

    await bot.sendMessage(Number(telegramId), message, {
      parse_mode: 'HTML',
      reply_markup: keyboard.length
        ? {
            inline_keyboard: keyboard,
          }
        : undefined,
    });
  } catch (error) {
    logger.error(`Ошибка отправки уведомления о реферальном бонусе пользователю ${telegramId}:`, error);
  }
};

export const getBotStartUrl = (startParam = 'start'): string | null => {
  if (!BOT_USERNAME) return null;
  return `https://t.me/${BOT_USERNAME}?start=${startParam}`;
};

export const getBotUsername = (): string | null => {
  return BOT_USERNAME || null;
};

export const sendWebAppWelcomeMessage = async (
  telegramId: bigint,
  payload: {
    firstName?: string | null;
    referralInviterName?: string | null;
    referralBonusAmount?: number | null;
  } = {},
): Promise<{ success: boolean; reason?: 'CHAT_NOT_FOUND' | 'UNKNOWN'; startUrl?: string }> => {
  const startUrl = getBotStartUrl();

  try {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        {
          text: '🛍️ Открыть магазин',
          web_app: { url: WEBAPP_URL },
        },
      ],
    ];

    const name = payload.firstName?.trim() || 'друг';
    const inviterName = payload.referralInviterName?.trim();
    const bonusAmount = payload.referralBonusAmount ?? referralService.getReferralBonusAmount();

    let message = `
👋 <b>Привет, ${name}!</b>

Добро пожаловать в <b>VapeKHV</b> — наш Telegram-магазин.
`.trim();

    if (inviterName) {
      message += `\n\nВы пришли по приглашению <b>${inviterName}</b>. После первой покупки мы начислим тебе <b>${bonusAmount}₽</b> бонусов.`;
    } else {
      message += `\n\nОформляй первый заказ и получай бонусы за покупки.`;
    }

    message += `\n\nНажми кнопку ниже, чтобы открыть каталог.`;

    await bot.sendMessage(Number(telegramId), message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    return { success: true, startUrl: startUrl ?? undefined };
  } catch (error: any) {
    const description = error?.response?.body?.description;
    if (description && description.includes('chat not found')) {
      logger.info(`Невозможно отправить приветственное сообщение пользователю ${telegramId}: чат не найден (пользователь не запустил бота).`);
      return { success: false, reason: 'CHAT_NOT_FOUND', startUrl: startUrl ?? undefined };
    }
    logger.error(`Ошибка отправки приветственного сообщения пользователю ${telegramId}:`, error);
    return { success: false, reason: 'UNKNOWN', startUrl: startUrl ?? undefined };
  }
};

/**
 * Отправить уведомление о поступлении товара
 */
export const sendStockNotification = async (
  telegramId: bigint,
  productName: string,
  productId: string
): Promise<void> => {
  try {
    const message = `
🔔 <b>Товар поступил в наличие!</b>

<b>${productName}</b> снова доступен для заказа.

Нажмите кнопку ниже, чтобы перейти к товару и оформить заказ.
    `.trim();

    await bot.sendMessage(
      Number(telegramId),
      message,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🛍️ Посмотреть товар',
                web_app: { url: `${WEBAPP_URL}/product/${productId}` },
              },
            ],
            [
              {
                text: '📦 Перейти в каталог',
                web_app: { url: `${WEBAPP_URL}/catalog` },
              },
            ],
          ],
        },
      }
    );

    logger.info(`🔔 Уведомление о товаре "${productName}" отправлено пользователю ${telegramId}`);
  } catch (error) {
    logger.error(`Ошибка отправки уведомления пользователю ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Отправить запрос на товар в чат заявок
 */
export const sendProductRequest = async (
  telegramId: bigint,
  userName: string,
  productRequest: string
): Promise<void> => {
  try {
    const REQUEST_CHAT_ID = -1003245299561; // ID чата для заявок на товары
    
    const message = `
🛍️ <b>Новый запрос на товар</b>

👤 <b>Пользователь:</b> ${userName}
🆔 <b>Telegram ID:</b> <code>${telegramId}</code>

📝 <b>Запрос:</b>
${productRequest}

━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toLocaleString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}</i>
    `.trim();

    await bot.sendMessage(
      REQUEST_CHAT_ID,
      message,
      {
        parse_mode: 'HTML',
      }
    );

    logger.info(`📝 Запрос на товар от пользователя ${telegramId} отправлен в чат ${REQUEST_CHAT_ID}`);
  } catch (error) {
    logger.error(`Ошибка отправки запроса на товар от пользователя ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Отправить промо-рассылку клиенту
 */
export const sendPromoBroadcast = async (
  telegramId: bigint
): Promise<void> => {
  try {
    const message = `⚡️ ХВАТИТ ОТКЛАДЫВАТЬ!

Пора заказать ништяки и получить результат УЖЕ СЕГОДНЯ.

ЖМИ 👇 и меняй жизнь к лучшему:

Только для тех, кто готов действовать! 🔥`;

    await bot.sendMessage(
      Number(telegramId),
      message,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 ЗАКАЗАТЬ',
                web_app: { url: WEBAPP_URL },
              },
            ],
          ],
        },
      }
    );

    logger.info(`📢 Промо-рассылка отправлена пользователю ${telegramId}`);
  } catch (error) {
    logger.error(`Ошибка отправки промо-рассылки пользователю ${telegramId}:`, error);
    throw error;
  }
};

/**
 * Отправить Excel отчет пользователю
 */
export const sendExcelReport = async (
  telegramId: bigint,
  buffer: Buffer,
  filename: string,
  caption?: string
): Promise<void> => {
  try {
    await bot.sendDocument(
      Number(telegramId),
      buffer,
      {
        caption: caption || '📊 Отчет по заказам',
        parse_mode: 'HTML',
      },
      {
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    );

    logger.info(`📊 Excel отчет "${filename}" отправлен пользователю ${telegramId}`);
  } catch (error) {
    logger.error(`Ошибка отправки Excel отчета пользователю ${telegramId}:`, error);
    throw error;
  }
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
