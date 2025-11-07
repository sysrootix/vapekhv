import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import bot from './bot.service';
import { audienceService } from './audience.service';
import { AudienceFilters } from '../types/audience';

export interface BroadcastButton {
  text: string;
  type: 'url' | 'web_app' | 'callback';
  value: string; // URL, web_app URL, or callback_data
}

export interface BroadcastMedia {
  type: 'photo' | 'video' | 'document';
  fileId?: string; // Telegram file_id if uploaded via bot
  url?: string; // External URL
  caption?: string;
}

export interface BroadcastMessage {
  text: string;
  media?: BroadcastMedia;
  buttons?: BroadcastButton[][]; // Array of button rows
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface BroadcastTarget {
  userIds?: string[]; // Specific user IDs
  audienceId?: string;
  filters?: AudienceFilters;
  segment?: 'all' | 'vip' | 'new' | 'inactive' | 'active';
  minSpent?: number;
  maxSpent?: number;
  minOrders?: number;
  maxOrders?: number;
  hasOrders?: boolean;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Get users based on broadcast target criteria
 */
async function getBroadcastTargetUsers(target: BroadcastTarget): Promise<Array<{ id: string; telegramId: bigint }>> {
  let users: Array<{ id: string; telegramId: bigint }>;

  if (target.audienceId || target.filters) {
    users = await audienceService.getUsersForBroadcast({
      audienceId: target.audienceId,
      filters: target.filters,
    });
  } else {
    users = await getUsersFromBuiltInTarget(target);
  }

  if (target.userIds?.length) {
    const allowed = new Set(target.userIds);
    users = users.filter((user) => allowed.has(user.id));
  }

  return users;
}

async function getUsersFromBuiltInTarget(target: BroadcastTarget): Promise<Array<{ id: string; telegramId: bigint }>> {
  const where: any = {};

  // Specific user IDs
  if (target.userIds && target.userIds.length > 0) {
    where.id = { in: target.userIds };
  }

  // Segment filters
  if (target.segment && target.segment !== 'all') {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    switch (target.segment) {
      case 'vip':
        where.OR = [
          { totalSpent: { gte: 50000 } },
        ];
        break;
      case 'new':
        where.createdAt = { gte: thirtyDaysAgo };
        where.orders = { none: {} };
        break;
      case 'inactive':
        where.lastLoginAt = { lt: sixtyDaysAgo };
        break;
      case 'active':
        where.lastLoginAt = { gte: thirtyDaysAgo };
        break;
    }
  }

  // Spent filters
  if (target.minSpent !== undefined) {
    where.totalSpent = { ...where.totalSpent, gte: target.minSpent };
  }
  if (target.maxSpent !== undefined) {
    where.totalSpent = { ...where.totalSpent, lte: target.maxSpent };
  }

  // Orders filters
  if (target.minOrders !== undefined || target.maxOrders !== undefined) {
    const orderCount = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: 'DELIVERED' },
      _count: true,
    });

    const userIds = orderCount
      .filter((item) => {
        const count = item._count;
        if (target.minOrders !== undefined && count < target.minOrders) return false;
        if (target.maxOrders !== undefined && count > target.maxOrders) return false;
        return true;
      })
      .map((item) => item.userId);

    if (where.id) {
      where.id = { in: target.userIds?.filter((id) => userIds.includes(id)) || [] };
    } else {
      where.id = { in: userIds };
    }
  }

  if (target.hasOrders !== undefined) {
    if (target.hasOrders) {
      where.orders = { some: {} };
    } else {
      where.orders = { none: {} };
    }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      telegramId: true,
    },
  });

  return users;
}

/**
 * Build inline keyboard from buttons
 */
function buildInlineKeyboard(buttons?: BroadcastButton[][]): TelegramBot.InlineKeyboardMarkup | undefined {
  if (!buttons || buttons.length === 0) {
    return undefined;
  }

  const keyboard: TelegramBot.InlineKeyboardButton[][] = buttons.map((row) =>
    row.map((button) => {
      switch (button.type) {
        case 'url':
          return { text: button.text, url: button.value };
        case 'web_app':
          return { text: button.text, web_app: { url: button.value } };
        case 'callback':
          return { text: button.text, callback_data: button.value };
        default:
          throw new Error(`Unknown button type: ${button.type}`);
      }
    })
  );

  return { inline_keyboard: keyboard };
}

/**
 * Send broadcast message to a single user
 */
async function sendBroadcastToUser(
  telegramId: bigint,
  message: BroadcastMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const options: TelegramBot.SendMessageOptions | TelegramBot.SendPhotoOptions | TelegramBot.SendVideoOptions | TelegramBot.SendDocumentOptions = {
      parse_mode: message.parseMode || 'HTML',
    };

    const keyboard = buildInlineKeyboard(message.buttons);
    if (keyboard) {
      options.reply_markup = keyboard;
    }

    // Send media if provided
    if (message.media) {
      if (message.media.type === 'photo') {
        if (message.media.fileId) {
          await bot.sendPhoto(Number(telegramId), message.media.fileId, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else if (message.media.url) {
          await bot.sendPhoto(Number(telegramId), message.media.url, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else {
          throw new Error('Photo requires either fileId or url');
        }
      } else if (message.media.type === 'video') {
        if (message.media.fileId) {
          await bot.sendVideo(Number(telegramId), message.media.fileId, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else if (message.media.url) {
          await bot.sendVideo(Number(telegramId), message.media.url, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else {
          throw new Error('Video requires either fileId or url');
        }
      } else if (message.media.type === 'document') {
        if (message.media.fileId) {
          await bot.sendDocument(Number(telegramId), message.media.fileId, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else if (message.media.url) {
          await bot.sendDocument(Number(telegramId), message.media.url, {
            caption: message.text || message.media.caption,
            parse_mode: options.parse_mode,
            reply_markup: keyboard,
          });
        } else {
          throw new Error('Document requires either fileId or url');
        }
      }
    } else {
      // Send text message only
      await bot.sendMessage(Number(telegramId), message.text, options);
    }

    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.response?.body?.description || error?.message || 'Unknown error';
    logger.error(`Failed to send broadcast to user ${telegramId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send broadcast to multiple users
 */
export async function sendBroadcast(
  message: BroadcastMessage,
  target: BroadcastTarget
): Promise<BroadcastResult> {
  logger.info('Starting broadcast...', { target, hasMedia: !!message.media, buttonsCount: message.buttons?.length || 0 });

  const users = await getBroadcastTargetUsers(target);
  logger.info(`Found ${users.length} users for broadcast`);

  const result: BroadcastResult = {
    total: users.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Send messages with rate limiting (20 messages per second max)
  const delayBetweenBatches = 1000; // 1 second
  const batchSize = 20;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (user) => {
        const sendResult = await sendBroadcastToUser(user.telegramId, message);
        if (sendResult.success) {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push({
            userId: user.id,
            error: sendResult.error || 'Unknown error',
          });
        }
      })
    );

    // Rate limiting: wait between batches (except for the last batch)
    if (i + batchSize < users.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  logger.info(`Broadcast completed: ${result.sent} sent, ${result.failed} failed`);
  return result;
}

/**
 * Get broadcast statistics
 */
export async function getBroadcastStats(target: BroadcastTarget): Promise<{
  totalUsers: number;
  segmentBreakdown?: Record<string, number>;
}> {
  const users = await getBroadcastTargetUsers(target);
  
  return {
    totalUsers: users.length,
  };
}
