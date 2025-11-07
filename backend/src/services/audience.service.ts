import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AudienceFilters, AudienceFiltersSchema, AudiencePayload, AudiencePayloadSchema } from '../types/audience';
import { AppError } from '../middleware/errorHandler';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

type BaseUser = {
  id: string;
  telegramId: bigint;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  bonusPoints: number;
  totalSpent: number;
  createdAt: Date;
  lastLoginAt: Date;
};

type OrderStats = {
  ordersCount: number;
  lastOrderAt: Date | null;
};

export type AudiencePreviewUser = {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  bonusPoints: number;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: Date | null;
  daysSinceLastOrder: number | null;
  daysSinceLastLogin: number;
  daysSinceRegistration: number;
};

type MatchedUser = {
  user: BaseUser;
  stats: OrderStats;
  derived: {
    daysSinceLastOrder: number | null;
    daysSinceLastLogin: number;
    daysSinceRegistration: number;
  };
};

class AudienceService {
  private parseFilters(raw: unknown): AudienceFilters {
    try {
      const parsed = AudienceFiltersSchema.parse(raw || {});
      return this.normalizeFilters(parsed);
    } catch (error) {
      throw new AppError('Некорректные фильтры аудитории', 400);
    }
  }

  private parsePayload(payload: unknown): AudiencePayload {
    try {
      return AudiencePayloadSchema.parse(payload);
    } catch (error) {
      throw new AppError('Некорректные данные аудитории', 400);
    }
  }

  private normalizeFilters(filters: AudienceFilters): AudienceFilters {
    const normalized: AudienceFilters = { ...filters };

    if (normalized.telegramIds) {
      normalized.telegramIds = normalized.telegramIds
        .map((value) => value.toString().trim())
        .filter((value) => value.length > 0);
    }

    if (normalized.usernameContains) {
      normalized.usernameContains = normalized.usernameContains.trim();
    }

    this.ensureRange(normalized.bonusPointsMin, normalized.bonusPointsMax, 'bonusPoints');
    this.ensureRange(normalized.totalSpentMin, normalized.totalSpentMax, 'totalSpent');
    this.ensureRange(normalized.ordersCountMin, normalized.ordersCountMax, 'ordersCount');
    this.ensureRange(normalized.daysSinceLastOrderMin, normalized.daysSinceLastOrderMax, 'daysSinceLastOrder');
    this.ensureRange(normalized.daysSinceLastLoginMin, normalized.daysSinceLastLoginMax, 'daysSinceLastLogin');
    this.ensureRange(normalized.daysSinceRegistrationMin, normalized.daysSinceRegistrationMax, 'daysSinceRegistration');

    return normalized;
  }

  private ensureRange(min: number | undefined, max: number | undefined, field: string) {
    if (min !== undefined && max !== undefined && min > max) {
      throw new AppError(`Минимальное значение больше максимального для ${field}`, 400);
    }
  }

  private buildUserWhere(filters: AudienceFilters): Prisma.UserWhereInput {
    const conditions: Prisma.UserWhereInput[] = [];
    const now = new Date();

    if (filters.includeUserIds?.length) {
      conditions.push({ id: { in: filters.includeUserIds } });
    }

    if (filters.excludeUserIds?.length) {
      conditions.push({ id: { notIn: filters.excludeUserIds } });
    }

    if (filters.telegramIds?.length) {
      const telegramIds = filters.telegramIds.map((value) => {
        const raw = value.toString().trim();
        if (!raw) {
          throw new AppError('Пустой telegram_id в фильтрах', 400);
        }
        try {
          return BigInt(raw);
        } catch (error) {
          throw new AppError(`Некорректный telegram_id: ${raw}`, 400);
        }
      });
      conditions.push({ telegramId: { in: telegramIds } });
    }

    if (filters.hasTelegramUsername === true) {
      conditions.push({ username: { not: null } });
    } else if (filters.hasTelegramUsername === false) {
      conditions.push({ username: null });
    }

    if (filters.usernameContains) {
      conditions.push({
        username: {
          contains: filters.usernameContains,
          mode: 'insensitive',
        },
      });
    }

    if (filters.hasPhone === true) {
      conditions.push({ phone: { not: null } });
    } else if (filters.hasPhone === false) {
      conditions.push({ phone: null });
    }

    if (typeof filters.isPremium === 'boolean') {
      conditions.push({ isPremium: filters.isPremium });
    }

    if (filters.bonusPointsMin !== undefined || filters.bonusPointsMax !== undefined) {
      const bonusFilter: Prisma.IntFilter = {};
      if (filters.bonusPointsMin !== undefined) {
        bonusFilter.gte = filters.bonusPointsMin;
      }
      if (filters.bonusPointsMax !== undefined) {
        bonusFilter.lte = filters.bonusPointsMax;
      }
      conditions.push({ bonusPoints: bonusFilter });
    }

    if (filters.totalSpentMin !== undefined || filters.totalSpentMax !== undefined) {
      const spentFilter: Prisma.FloatFilter = {};
      if (filters.totalSpentMin !== undefined) {
        spentFilter.gte = filters.totalSpentMin;
      }
      if (filters.totalSpentMax !== undefined) {
        spentFilter.lte = filters.totalSpentMax;
      }
      conditions.push({ totalSpent: spentFilter });
    }

    if (filters.hasOrders === true) {
      conditions.push({ orders: { some: { status: 'DELIVERED' } } });
    } else if (filters.hasOrders === false) {
      conditions.push({ orders: { none: { status: 'DELIVERED' } } });
    }

    if (filters.daysSinceLastLoginMin !== undefined || filters.daysSinceLastLoginMax !== undefined) {
      const loginFilter: Prisma.DateTimeFilter = {};
      if (filters.daysSinceLastLoginMin !== undefined) {
        const threshold = new Date(now.getTime() - filters.daysSinceLastLoginMin * MS_IN_DAY);
        loginFilter.lt = threshold;
      }
      if (filters.daysSinceLastLoginMax !== undefined) {
        const threshold = new Date(now.getTime() - filters.daysSinceLastLoginMax * MS_IN_DAY);
        loginFilter.gt = threshold;
      }
      conditions.push({ lastLoginAt: loginFilter });
    }

    if (filters.daysSinceRegistrationMin !== undefined || filters.daysSinceRegistrationMax !== undefined) {
      const registrationFilter: Prisma.DateTimeFilter = {};
      if (filters.daysSinceRegistrationMin !== undefined) {
        const threshold = new Date(now.getTime() - filters.daysSinceRegistrationMin * MS_IN_DAY);
        registrationFilter.lt = threshold;
      }
      if (filters.daysSinceRegistrationMax !== undefined) {
        const threshold = new Date(now.getTime() - filters.daysSinceRegistrationMax * MS_IN_DAY);
        registrationFilter.gt = threshold;
      }
      conditions.push({ createdAt: registrationFilter });
    }

    if (!conditions.length) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { AND: conditions };
  }

  private async getOrderStats(userIds: string[]): Promise<Record<string, OrderStats>> {
    if (userIds.length === 0) {
      return {};
    }

    const stats = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'DELIVERED',
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    return stats.reduce<Record<string, OrderStats>>((acc, item) => {
      acc[item.userId] = {
        ordersCount: item._count._all,
        lastOrderAt: item._max.createdAt,
      };
      return acc;
    }, {});
  }

  private diffInDays(from: Date, to: Date): number {
    return Math.floor((from.getTime() - to.getTime()) / MS_IN_DAY);
  }

  private buildDerived(user: BaseUser, stats: OrderStats, now: Date) {
    return {
      daysSinceLastOrder: stats.lastOrderAt ? this.diffInDays(now, stats.lastOrderAt) : null,
      daysSinceLastLogin: this.diffInDays(now, user.lastLoginAt || user.createdAt),
      daysSinceRegistration: this.diffInDays(now, user.createdAt),
    };
  }

  private passesAdvancedFilters(match: MatchedUser, filters: AudienceFilters): boolean {
    const ordersCount = match.stats.ordersCount;

    if (filters.ordersCountMin !== undefined && ordersCount < filters.ordersCountMin) {
      return false;
    }

    if (filters.ordersCountMax !== undefined && ordersCount > filters.ordersCountMax) {
      return false;
    }

    if (filters.hasOrders === true && ordersCount === 0) {
      return false;
    }

    if (filters.hasOrders === false && ordersCount > 0) {
      return false;
    }

    if (filters.daysSinceLastOrderMin !== undefined) {
      const value = match.derived.daysSinceLastOrder ?? Number.POSITIVE_INFINITY;
      if (value < filters.daysSinceLastOrderMin) {
        return false;
      }
    }

    if (filters.daysSinceLastOrderMax !== undefined) {
      if (match.derived.daysSinceLastOrder === null) {
        return false;
      }
      if (match.derived.daysSinceLastOrder > filters.daysSinceLastOrderMax) {
        return false;
      }
    }

    if (filters.daysSinceLastLoginMin !== undefined && match.derived.daysSinceLastLogin < filters.daysSinceLastLoginMin) {
      return false;
    }

    if (filters.daysSinceLastLoginMax !== undefined && match.derived.daysSinceLastLogin > filters.daysSinceLastLoginMax) {
      return false;
    }

    if (
      filters.daysSinceRegistrationMin !== undefined &&
      match.derived.daysSinceRegistration < filters.daysSinceRegistrationMin
    ) {
      return false;
    }

    if (
      filters.daysSinceRegistrationMax !== undefined &&
      match.derived.daysSinceRegistration > filters.daysSinceRegistrationMax
    ) {
      return false;
    }

    return true;
  }

  private projectPreview(match: MatchedUser): AudiencePreviewUser {
    return {
      id: match.user.id,
      telegramId: match.user.telegramId.toString(),
      firstName: match.user.firstName,
      lastName: match.user.lastName,
      username: match.user.username,
      phone: match.user.phone,
      bonusPoints: match.user.bonusPoints,
      totalSpent: match.user.totalSpent,
      ordersCount: match.stats.ordersCount,
      lastOrderAt: match.stats.lastOrderAt,
      daysSinceLastOrder: match.derived.daysSinceLastOrder,
      daysSinceLastLogin: match.derived.daysSinceLastLogin,
      daysSinceRegistration: match.derived.daysSinceRegistration,
    };
  }

  private async matchUsers(filters: AudienceFilters): Promise<MatchedUser[]> {
    const where = this.buildUserWhere(filters);

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        bonusPoints: true,
        totalSpent: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!users.length) {
      return [];
    }

    const stats = await this.getOrderStats(users.map((user) => user.id));
    const now = new Date();

    return users
      .map<MatchedUser>((user) => {
        const userStats = stats[user.id] || { ordersCount: 0, lastOrderAt: null };
        const derived = this.buildDerived(user, userStats, now);
        return { user, stats: userStats, derived };
      })
      .filter((match) => this.passesAdvancedFilters(match, filters));
  }

  async previewFilters(rawFilters: unknown, limit = 50) {
    const filters = this.parseFilters(rawFilters);
    const matches = await this.matchUsers(filters);

    return {
      filters,
      totalUsers: matches.length,
      users: matches.slice(0, limit).map((match) => this.projectPreview(match)),
    };
  }

  async previewAudience(audienceId: string, limit = 50) {
    const audience = await prisma.audience.findUnique({
      where: { id: audienceId },
    });

    if (!audience) {
      throw new AppError('Аудитория не найдена', 404);
    }

    const filters = this.parseFilters(audience.filters);
    const preview = await this.previewFilters(filters, limit);

    return {
      audience: {
        ...audience,
        filters,
      },
      preview,
    };
  }

  async listAudiences() {
    return prisma.audience.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        userCount: true,
        lastEvaluatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAudience(id: string) {
    const audience = await prisma.audience.findUnique({
      where: { id },
    });

    if (!audience) {
      throw new AppError('Аудитория не найдена', 404);
    }

    return {
      ...audience,
      filters: this.parseFilters(audience.filters),
    };
  }

  async createAudience(payload: unknown, createdById?: string) {
    const parsed = this.parsePayload(payload);
    const filters = this.parseFilters(parsed.filters);
    const matches = await this.matchUsers(filters);

    const audience = await prisma.audience.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        filters,
        userCount: matches.length,
        lastEvaluatedAt: new Date(),
        createdById,
      },
    });

    return {
      audience: {
        ...audience,
        filters,
      },
      preview: matches.slice(0, 50).map((match) => this.projectPreview(match)),
      totalUsers: matches.length,
    };
  }

  async updateAudience(id: string, payload: unknown) {
    const exists = await prisma.audience.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('Аудитория не найдена', 404);
    }

    const parsed = this.parsePayload(payload);
    const filters = this.parseFilters(parsed.filters);
    const matches = await this.matchUsers(filters);

    const audience = await prisma.audience.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description,
        filters,
        userCount: matches.length,
        lastEvaluatedAt: new Date(),
      },
    });

    return {
      audience: {
        ...audience,
        filters,
      },
      preview: matches.slice(0, 50).map((match) => this.projectPreview(match)),
      totalUsers: matches.length,
    };
  }

  async deleteAudience(id: string) {
    const exists = await prisma.audience.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError('Аудитория не найдена', 404);
    }

    await prisma.audience.delete({
      where: { id },
    });
  }

  async getUsersForBroadcast(options: { audienceId?: string; filters?: unknown }) {
    let filters: AudienceFilters | null = null;

    if (options.audienceId) {
      const audience = await this.getAudience(options.audienceId);
      filters = audience.filters;
    } else if (options.filters) {
      filters = this.parseFilters(options.filters);
    }

    if (!filters) {
      throw new AppError('Не заданы фильтры аудитории', 400);
    }

    const matches = await this.matchUsers(filters);
    return matches.map((match) => ({
      id: match.user.id,
      telegramId: match.user.telegramId,
    }));
  }
}

export const audienceService = new AudienceService();
