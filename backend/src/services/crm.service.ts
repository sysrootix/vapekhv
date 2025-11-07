import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type RevenueInterval = 'daily' | 'weekly' | 'monthly';

export type CustomerSegment = 'VIP' | 'REGULAR' | 'NEW' | 'AT_RISK' | 'CHURNED' | 'NONE';

// Функция для определения сегмента клиента
export function getCustomerSegment(
  totalSpent: number,
  ordersCount: number,
  daysSinceRegistration: number,
  daysSinceLastOrder: number | null
): CustomerSegment {
  // VIP: потратил > 50000₽ или сделал > 20 заказов
  if (totalSpent > 50000 || ordersCount > 20) {
    return 'VIP';
  }

  // Постоянный: потратил > 10000₽ и сделал >= 5 заказов
  if (totalSpent > 10000 && ordersCount >= 5) {
    return 'REGULAR';
  }

  // Новичок: сделал < 3 заказов и зарегистрирован < 30 дней
  if (ordersCount < 3 && daysSinceRegistration < 30) {
    return 'NEW';
  }

  // Ушедший: последний заказ > 180 дней назад
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 180) {
    return 'CHURNED';
  }

  // Неактивный: последний заказ > 60 дней назад и раньше делал >= 3 заказа
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 60 && ordersCount >= 3) {
    return 'AT_RISK';
  }

  return 'NONE';
}

interface RevenueSeriesPoint {
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  ordersCount: number;
}

interface NewUsersSeriesPoint {
  periodStart: string;
  periodEnd: string;
  usersCount: number;
}

interface CrmOverviewTopCustomer {
  id: string;
  telegramId: string;
  name: string | null;
  username?: string | null;
  phone?: string | null;
  bonusPoints: number;
  totalSpent: number;
  deliveredRevenue: number;
  deliveredOrders: number;
  lastOrderAt: string | null;
  lastOrderTotal: number | null;
}

interface CrmOverviewTopProduct {
  id: string;
  name: string | null;
  imageUrl: string | null;
  totalQuantity: number;
  totalRevenue: number;
  orderLines: number;
}

export interface CrmOverview {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  comparePeriodStart?: string;
  comparePeriodEnd?: string;
  metrics: {
    totalUsers: number;
    newUsersInPeriod: number;
    activeUsers30d: number;
    payingUsers: number;
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    revenueInPeriod: number;
    averageOrderValue: number;
    ordersPerPayingUser: number;
    averageBasketDepth: number;
    productsInPeriod: number;
    totalBonusEarned: number;
    totalBonusSpent: number;
    // Сравнение с предыдущим периодом
    compare?: {
      revenueChange: number;
      revenueChangePercent: number;
      ordersChange: number;
      ordersChangePercent: number;
      newUsersChange: number;
      newUsersChangePercent: number;
      averageOrderValueChange: number;
      averageOrderValueChangePercent: number;
      bonusEarnedChange: number;
      bonusEarnedChangePercent: number;
      bonusSpentChange: number;
      bonusSpentChangePercent: number;
    };
  };
  topCustomers: CrmOverviewTopCustomer[];
  topProducts: CrmOverviewTopProduct[];
}

export interface CrmUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: 'spent_desc' | 'spent_asc' | 'newest' | 'oldest' | 'last_active' | 'bonuses_desc';
}

export interface CrmUsersResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  items: Array<{
    id: string;
    telegramId: string;
    name: string | null;
    username?: string | null;
    phone?: string | null;
    bonusPoints: number;
    totalSpent: number;
    ordersCount: number;
    deliveredOrders: number;
    averageOrderValue: number;
    segment: CustomerSegment;
    lastOrder: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    } | null;
    createdAt: string;
    lastLoginAt: string;
  }>;
}

type UserSummary = {
  id: string;
  telegramId: bigint;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  bonusPoints: number;
  totalSpent: number;
};

type CrmUserListItem = {
  id: string;
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  bonusPoints: number;
  totalSpent: number;
  createdAt: Date;
  lastLoginAt: Date;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
  }>;
  _count: { orders: number };
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryCost: number;
  bonusUsed: number;
  bonusEarned: number;
  createdAt: Date;
  items: Array<{
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  }>;
};

type BonusHistoryGroup = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: Date;
  orderId: string | null;
};

export interface CrmUserDetails {
  user: {
    id: string;
    telegramId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    bonusPoints: number;
    totalSpent: number;
    createdAt: string;
    lastLoginAt: string;
  };
  stats: {
    totalOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    deliveredRevenue: number;
    averageOrderValue: number;
    totalBonusEarned: number;
    totalBonusSpent: number;
    totalBonusRefunded: number;
    totalBonusGifted: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    lastOrderNumber: string | null;
    lastOrderTotal: number | null;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    deliveryCost: number;
    bonusUsed: number;
    bonusEarned: number;
    createdAt: string;
    items: Array<{
      productId: string;
      name: string;
      imageUrl: string | null;
      quantity: number;
      price: number;
    }>;
  }>;
  bonusHistory: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
    orderId: string | null;
  }>;
}


const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const startOfDayUtc = (value: Date): Date => {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

const startOfWeekUtc = (value: Date): Date => {
  const day = value.getUTCDay(); // 0 (Sun) ... 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  return start;
};

const startOfMonthUtc = (value: Date): Date => {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
};

const addDaysUtc = (value: Date, days: number): Date => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const addWeeksUtc = (value: Date, weeks: number): Date => {
  return addDaysUtc(value, weeks * 7);
};

const addMonthsUtc = (value: Date, months: number): Date => {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
};

const buildUserDisplayName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string | null => {
  const parts = [user.firstName, user.lastName].filter(Boolean) as string[];
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return user.username ?? null;
};

export async function fetchCrmOverview(params: {
  startDate?: Date | string;
  endDate?: Date | string;
  compareStartDate?: Date | string;
  compareEndDate?: Date | string;
  rangeDays?: number;
}): Promise<CrmOverview> {
  const generatedAt = new Date();
  
  // Определяем период
  let periodStart: Date;
  let periodEnd: Date;
  
  if (params.startDate && params.endDate) {
    periodStart = typeof params.startDate === 'string' ? new Date(params.startDate) : params.startDate;
    periodEnd = typeof params.endDate === 'string' ? new Date(params.endDate) : params.endDate;
    periodStart = startOfDayUtc(periodStart);
    // endDate приходит как строка формата YYYY-MM-DD, которая парсится как начало дня
    // Нам нужно, чтобы это был конец дня (начало следующего дня)
    // Если endDate = "2025-11-08", это означает конец 07.11 (начало 08.11)
    periodEnd = startOfDayUtc(periodEnd);
    // endDate уже должен быть началом следующего дня, но если это не так, добавляем день
    // Проверяем: если endDate равен startOfDay(endDate), значит это начало дня, добавляем день
    const endDateNormalized = startOfDayUtc(periodEnd);
    if (endDateNormalized.getTime() === periodEnd.getTime()) {
      // Это начало дня, нужно добавить день чтобы получить конец предыдущего дня
      periodEnd = addDaysUtc(periodEnd, 1);
    }
  } else {
    const rangeDays = clampNumber(params.rangeDays ?? 30, 1, 365);
    periodStart = startOfDayUtc(addDaysUtc(generatedAt, -1 * (rangeDays - 1)));
    periodEnd = startOfDayUtc(addDaysUtc(generatedAt, 1)); // Конец сегодняшнего дня
  }

  // Определяем период для сравнения
  let comparePeriodStart: Date | undefined;
  let comparePeriodEnd: Date | undefined;
  
  if (params.compareStartDate && params.compareEndDate) {
    comparePeriodStart = typeof params.compareStartDate === 'string' ? new Date(params.compareStartDate) : params.compareStartDate;
    comparePeriodEnd = typeof params.compareEndDate === 'string' ? new Date(params.compareEndDate) : params.compareEndDate;
    comparePeriodStart = startOfDayUtc(comparePeriodStart);
    comparePeriodEnd = startOfDayUtc(comparePeriodEnd);
    const compareEndDateStartOfDay = startOfDayUtc(comparePeriodEnd);
    if (compareEndDateStartOfDay.getTime() === comparePeriodEnd.getTime()) {
      comparePeriodEnd = addDaysUtc(comparePeriodEnd, 1);
    }
  } else if (params.startDate && params.endDate) {
    // Автоматически вычисляем предыдущий период той же длительности
    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    
    // Проверяем, является ли период месяцем (примерно 28-31 день)
    const daysDiff = Math.round(periodDuration / (24 * 60 * 60 * 1000));
    const isMonthPeriod = daysDiff >= 28 && daysDiff <= 31;
    
    if (isMonthPeriod) {
      // Для месячных периодов сравниваем с предыдущим месяцем
      const periodStartMonth = periodStart.getUTCMonth();
      const periodStartYear = periodStart.getUTCFullYear();
      
      // Вычисляем предыдущий месяц
      let prevMonth = periodStartMonth - 1;
      let prevYear = periodStartYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      
      comparePeriodStart = new Date(Date.UTC(prevYear, prevMonth, 1));
      comparePeriodEnd = new Date(Date.UTC(prevYear, prevMonth + 1, 1));
    } else {
      // Для остальных периодов используем предыдущий период той же длительности
      comparePeriodEnd = periodStart;
      comparePeriodStart = new Date(comparePeriodEnd.getTime() - periodDuration);
    }
  }

  const activeStart = addDaysUtc(generatedAt, -30);

  const [
    totalUsers,
    newUsersInPeriod,
    activeUsers30d,
    payingUsers,
    periodPayingUsers,
    totalOrders,
    pendingOrders,
    processingOrders,
    totalRevenueAgg,
    periodRevenueAgg,
    periodOrdersAgg,
    periodProductsAgg,
    periodBonusSummaryRaw,
    compareRevenueAgg,
    compareOrdersAgg,
    compareNewUsersAgg,
    compareBonusSummaryRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    }),
    prisma.user.count({
      where: {
        orders: {
          some: {
            status: 'DELIVERED',
            createdAt: {
              gte: activeStart,
            },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        orders: {
          some: {
            status: 'DELIVERED',
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        orders: {
          some: {
            status: 'DELIVERED',
            createdAt: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        },
      },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      _count: { _all: true },
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: 'DELIVERED',
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.bonusTransaction.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      _sum: { amount: true },
    }),
    comparePeriodStart && comparePeriodEnd
      ? prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: comparePeriodStart,
              lt: comparePeriodEnd,
            },
          },
          _sum: { totalAmount: true },
        })
      : Promise.resolve({ _sum: { totalAmount: null } }),
    comparePeriodStart && comparePeriodEnd
      ? prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: comparePeriodStart,
              lt: comparePeriodEnd,
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve({ _count: { _all: 0 } }),
    comparePeriodStart && comparePeriodEnd
      ? prisma.user.count({
          where: {
            createdAt: {
              gte: comparePeriodStart,
              lt: comparePeriodEnd,
            },
          },
        })
      : Promise.resolve(0),
    comparePeriodStart && comparePeriodEnd
      ? prisma.bonusTransaction.groupBy({
          by: ['type'],
          where: {
            createdAt: {
              gte: comparePeriodStart,
              lt: comparePeriodEnd,
            },
          },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const totalRevenue = toNumber(totalRevenueAgg._sum.totalAmount);
  const periodRevenue = toNumber(periodRevenueAgg._sum.totalAmount);
  const periodOrdersCount = toNumber(periodOrdersAgg._count._all);
  const periodProductsCount = toNumber(periodProductsAgg._sum.quantity);
  const averageOrderValue = periodOrdersCount > 0 ? periodRevenue / periodOrdersCount : 0;
  const ordersPerPayingUser = periodPayingUsers > 0 ? periodOrdersCount / periodPayingUsers : 0;
  const averageBasketDepth = periodOrdersCount > 0 ? periodProductsCount / periodOrdersCount : 0;

  const bonusSummary = {
    EARNED: 0,
    SPENT: 0,
    GIFT: 0,
    EXPIRED: 0,
    REFUND: 0,
  } as Record<string, number>;

  const bonusGroups = periodBonusSummaryRaw as Array<{ type: string; _sum: { amount: unknown } }>;

  bonusGroups.forEach(item => {
    bonusSummary[item.type] = toNumber(item._sum.amount);
  });

  // Расчет сравнения с предыдущим периодом
  let compare: CrmOverview['metrics']['compare'] | undefined;
  if (comparePeriodStart && comparePeriodEnd) {
    const compareRevenue = toNumber(compareRevenueAgg._sum.totalAmount);
    const compareOrdersCount = toNumber(compareOrdersAgg._count._all);
    const compareNewUsers = toNumber(compareNewUsersAgg);
    const compareAverageOrderValue = compareOrdersCount > 0 ? compareRevenue / compareOrdersCount : 0;

    const compareBonusSummary = {
      EARNED: 0,
      SPENT: 0,
      GIFT: 0,
      EXPIRED: 0,
      REFUND: 0,
    } as Record<string, number>;

    const compareBonusGroups = compareBonusSummaryRaw as Array<{ type: string; _sum: { amount: unknown } }>;
    compareBonusGroups.forEach(item => {
      compareBonusSummary[item.type] = toNumber(item._sum.amount);
    });

    const revenueChange = periodRevenue - compareRevenue;
    const revenueChangePercent = compareRevenue > 0 ? (revenueChange / compareRevenue) * 100 : 0;

    const ordersChange = periodOrdersCount - compareOrdersCount;
    const ordersChangePercent = compareOrdersCount > 0 ? (ordersChange / compareOrdersCount) * 100 : 0;

    const newUsersChange = newUsersInPeriod - compareNewUsers;
    const newUsersChangePercent = compareNewUsers > 0 ? (newUsersChange / compareNewUsers) * 100 : 0;

    const averageOrderValueChange = averageOrderValue - compareAverageOrderValue;
    const averageOrderValueChangePercent = compareAverageOrderValue > 0 ? (averageOrderValueChange / compareAverageOrderValue) * 100 : 0;

    const bonusEarnedChange = bonusSummary.EARNED - compareBonusSummary.EARNED;
    const bonusEarnedChangePercent = compareBonusSummary.EARNED > 0 ? (bonusEarnedChange / compareBonusSummary.EARNED) * 100 : 0;

    const bonusSpentChange = bonusSummary.SPENT - compareBonusSummary.SPENT;
    const bonusSpentChangePercent = compareBonusSummary.SPENT > 0 ? (bonusSpentChange / compareBonusSummary.SPENT) * 100 : 0;

    compare = {
      revenueChange,
      revenueChangePercent,
      ordersChange,
      ordersChangePercent,
      newUsersChange,
      newUsersChangePercent,
      averageOrderValueChange,
      averageOrderValueChangePercent,
      bonusEarnedChange,
      bonusEarnedChangePercent,
      bonusSpentChange,
      bonusSpentChangePercent,
    };
  }

  type TopCustomerGroup = { userId: string; _sum: { totalAmount: unknown }; _count: { _all: number } };

  const topCustomersRawResult = await prisma.order.groupBy({
    by: ['userId'],
    where: { status: 'DELIVERED' },
    _sum: { totalAmount: true },
    _count: { _all: true },
    orderBy: {
      _sum: {
        totalAmount: 'desc',
      },
    },
    take: 5,
  });
  const topCustomersRaw = topCustomersRawResult as TopCustomerGroup[];

  const topCustomerIds = topCustomersRaw.map((item: TopCustomerGroup) => item.userId);
  const topCustomersUsers: UserSummary[] = topCustomerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topCustomerIds } },
        select: {
          id: true,
          telegramId: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          bonusPoints: true,
          totalSpent: true,
        },
      }) as UserSummary[]
    : [];

  const topCustomersUserMap = new Map<string, UserSummary>(
    topCustomersUsers.map((user) => [user.id, user])
  );

  const topCustomersList = await Promise.all(
    topCustomersRaw.map(async (item: TopCustomerGroup): Promise<CrmOverviewTopCustomer | null> => {
      const user = topCustomersUserMap.get(item.userId);
      if (!user) {
        return null;
      }

      const lastOrder = await prisma.order.findFirst({
        where: { userId: item.userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, totalAmount: true },
      });

      const deliveredRevenue = toNumber(item._sum.totalAmount);
      const deliveredCount = item._count._all ?? 0;

      return {
        id: user.id,
        telegramId: user.telegramId.toString(),
        name: buildUserDisplayName(user),
        username: user.username,
        phone: user.phone,
        bonusPoints: user.bonusPoints,
        totalSpent: user.totalSpent,
        deliveredRevenue,
        deliveredOrders: deliveredCount,
        lastOrderAt: lastOrder?.createdAt?.toISOString() ?? null,
        lastOrderTotal: lastOrder ? toNumber(lastOrder.totalAmount) : null,
      };
    })
  );

  const topCustomers: CrmOverviewTopCustomer[] = topCustomersList.filter(
    (item): item is CrmOverviewTopCustomer => Boolean(item)
  );

  const topProductsRows = (await prisma.$queryRaw`
    SELECT
      oi."productId" AS "productId",
      p.name AS "name",
      p."imageUrl" AS "imageUrl",
      SUM(oi.quantity) AS "totalQuantity",
      SUM(oi.quantity * oi.price) AS "totalRevenue",
      COUNT(*) AS "orderCount"
    FROM "order_items" oi
    INNER JOIN "orders" o ON o.id = oi."orderId"
    LEFT JOIN "products" p ON p.id = oi."productId"
    WHERE o.status = 'DELIVERED'
      AND o."createdAt" >= ${periodStart}
      AND o."createdAt" < ${periodEnd}
    GROUP BY oi."productId", p.name, p."imageUrl"
    ORDER BY SUM(oi.quantity * oi.price) DESC
    LIMIT 5
  `) as Array<{
    productId: string;
    name: string | null;
    imageUrl: string | null;
    totalQuantity: string | number | bigint | null;
    totalRevenue: string | number | bigint | null;
    orderCount: string | number | bigint | null;
  }>;

  const topProducts: CrmOverviewTopProduct[] = topProductsRows.map((row: (typeof topProductsRows)[number]) => ({
    id: row.productId,
    name: row.name,
    imageUrl: row.imageUrl,
    totalQuantity: toNumber(row.totalQuantity),
    totalRevenue: toNumber(row.totalRevenue),
    orderLines: toNumber(row.orderCount),
  }));

  return {
    generatedAt: generatedAt.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    comparePeriodStart: comparePeriodStart?.toISOString(),
    comparePeriodEnd: comparePeriodEnd?.toISOString(),
    metrics: {
      totalUsers,
      newUsersInPeriod,
      activeUsers30d,
      payingUsers,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders: periodOrdersCount,
      totalRevenue,
      revenueInPeriod: periodRevenue,
      averageOrderValue,
      ordersPerPayingUser,
      averageBasketDepth,
      productsInPeriod: periodProductsCount,
      totalBonusEarned: bonusSummary.EARNED,
      totalBonusSpent: bonusSummary.SPENT,
      compare,
    },
    topCustomers,
    topProducts,
  };
}

export async function fetchRevenueSeries(params: {
  interval: RevenueInterval;
  periods: number;
}): Promise<{
  interval: RevenueInterval;
  periods: number;
  from: string;
  to: string;
  points: RevenueSeriesPoint[];
}> {
  const interval = params.interval;
  const clampedPeriods = clampNumber(params.periods, 1, 180);
  const now = new Date();

  const computeStart = (reference: Date): Date => {
    switch (interval) {
      case 'weekly':
        return startOfWeekUtc(reference);
      case 'monthly':
        return startOfMonthUtc(reference);
      default:
        return startOfDayUtc(reference);
    }
  };

  const addInterval = (value: Date, count: number): Date => {
    switch (interval) {
      case 'weekly':
        return addWeeksUtc(value, count);
      case 'monthly':
        return addMonthsUtc(value, count);
      default:
        return addDaysUtc(value, count);
    }
  };

  const endPeriodStart = computeStart(now);
  const fromStart = addInterval(endPeriodStart, -1 * (clampedPeriods - 1));

  const intervalUnitMap: Record<RevenueInterval, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
  };

  const intervalUnit = intervalUnitMap[interval];
  const rawRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`date_trunc('${intervalUnit}', "createdAt")`)} AS "period",
        SUM("totalAmount") AS "totalAmount",
        COUNT(*) AS "ordersCount"
      FROM "orders"
      WHERE status = 'DELIVERED' AND "createdAt" >= ${fromStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  )) as Array<{
    period: Date;
    totalAmount: unknown;
    ordersCount: unknown;
  }>;

  const bucketMap = new Map<string, { totalAmount: number; ordersCount: number }>();
  rawRows.forEach((row: (typeof rawRows)[number]) => {
    const bucketKey = new Date(row.period).toISOString();
    bucketMap.set(bucketKey, {
      totalAmount: toNumber(row.totalAmount),
      ordersCount: toNumber(row.ordersCount),
    });
  });

  const points: RevenueSeriesPoint[] = [];
  for (let index = 0; index < clampedPeriods; index += 1) {
    const periodStart = addInterval(fromStart, index);
    const periodEnd = addInterval(periodStart, 1);
    const key = periodStart.toISOString();
    const bucket = bucketMap.get(key) ?? { totalAmount: 0, ordersCount: 0 };
    points.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalAmount: bucket.totalAmount,
      ordersCount: bucket.ordersCount,
    });
  }

  return {
    interval,
    periods: clampedPeriods,
    from: fromStart.toISOString(),
    to: addInterval(fromStart, clampedPeriods).toISOString(),
    points,
  };
}

export async function fetchNewUsersSeries(params: {
  interval: RevenueInterval;
  periods: number;
}): Promise<{
  interval: RevenueInterval;
  periods: number;
  from: string;
  to: string;
  points: NewUsersSeriesPoint[];
}> {
  const interval = params.interval;
  const clampedPeriods = clampNumber(params.periods, 1, 180);
  const now = new Date();

  const computeStart = (reference: Date): Date => {
    switch (interval) {
      case 'weekly':
        return startOfWeekUtc(reference);
      case 'monthly':
        return startOfMonthUtc(reference);
      default:
        return startOfDayUtc(reference);
    }
  };

  const addInterval = (value: Date, count: number): Date => {
    switch (interval) {
      case 'weekly':
        return addWeeksUtc(value, count);
      case 'monthly':
        return addMonthsUtc(value, count);
      default:
        return addDaysUtc(value, count);
    }
  };

  const endPeriodStart = computeStart(now);
  const fromStart = addInterval(endPeriodStart, -1 * (clampedPeriods - 1));

  const intervalUnitMap: Record<RevenueInterval, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
  };

  const intervalUnit = intervalUnitMap[interval];
  const rawRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`date_trunc('${intervalUnit}', "createdAt")`)} AS "period",
        COUNT(*) AS "usersCount"
      FROM "users"
      WHERE "createdAt" >= ${fromStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  )) as Array<{
    period: Date;
    usersCount: unknown;
  }>;

  const bucketMap = new Map<string, number>();
  rawRows.forEach((row) => {
    const bucketKey = new Date(row.period).toISOString();
    bucketMap.set(bucketKey, toNumber(row.usersCount));
  });

  const points: NewUsersSeriesPoint[] = [];
  for (let index = 0; index < clampedPeriods; index += 1) {
    const periodStart = addInterval(fromStart, index);
    const periodEnd = addInterval(periodStart, 1);
    const key = periodStart.toISOString();
    const usersCount = bucketMap.get(key) ?? 0;

    points.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      usersCount,
    });
  }

  return {
    interval,
    periods: clampedPeriods,
    from: fromStart.toISOString(),
    to: addInterval(fromStart, clampedPeriods).toISOString(),
    points,
  };
}

interface OrdersSeriesPoint {
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
}

interface ProductsSeriesPoint {
  periodStart: string;
  periodEnd: string;
  productsCount: number;
}

interface BasketDepthSeriesPoint {
  periodStart: string;
  periodEnd: string;
  averageBasketDepth: number;
}

export async function fetchOrdersSeries(params: {
  interval: RevenueInterval;
  periods: number;
}): Promise<{
  interval: RevenueInterval;
  periods: number;
  from: string;
  to: string;
  points: OrdersSeriesPoint[];
}> {
  const interval = params.interval;
  const clampedPeriods = clampNumber(params.periods, 1, 180);
  const now = new Date();

  const computeStart = (reference: Date): Date => {
    switch (interval) {
      case 'weekly':
        return startOfWeekUtc(reference);
      case 'monthly':
        return startOfMonthUtc(reference);
      default:
        return startOfDayUtc(reference);
    }
  };

  const addInterval = (value: Date, count: number): Date => {
    switch (interval) {
      case 'weekly':
        return addWeeksUtc(value, count);
      case 'monthly':
        return addMonthsUtc(value, count);
      default:
        return addDaysUtc(value, count);
    }
  };

  const endPeriodStart = computeStart(now);
  const fromStart = addInterval(endPeriodStart, -1 * (clampedPeriods - 1));

  const intervalUnitMap: Record<RevenueInterval, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
  };

  const intervalUnit = intervalUnitMap[interval];
  const rawRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`date_trunc('${intervalUnit}', "createdAt")`)} AS "period",
        COUNT(*) AS "ordersCount"
      FROM "orders"
      WHERE status = 'DELIVERED' AND "createdAt" >= ${fromStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  )) as Array<{
    period: Date;
    ordersCount: unknown;
  }>;

  const bucketMap = new Map<string, number>();
  rawRows.forEach((row) => {
    const bucketKey = new Date(row.period).toISOString();
    bucketMap.set(bucketKey, toNumber(row.ordersCount));
  });

  const points: OrdersSeriesPoint[] = [];
  for (let index = 0; index < clampedPeriods; index += 1) {
    const periodStart = addInterval(fromStart, index);
    const periodEnd = addInterval(periodStart, 1);
    const key = periodStart.toISOString();
    const ordersCount = bucketMap.get(key) ?? 0;

    points.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      ordersCount,
    });
  }

  return {
    interval,
    periods: clampedPeriods,
    from: fromStart.toISOString(),
    to: addInterval(fromStart, clampedPeriods).toISOString(),
    points,
  };
}

export async function fetchProductsSeries(params: {
  interval: RevenueInterval;
  periods: number;
}): Promise<{
  interval: RevenueInterval;
  periods: number;
  from: string;
  to: string;
  points: ProductsSeriesPoint[];
}> {
  const interval = params.interval;
  const clampedPeriods = clampNumber(params.periods, 1, 180);
  const now = new Date();

  const computeStart = (reference: Date): Date => {
    switch (interval) {
      case 'weekly':
        return startOfWeekUtc(reference);
      case 'monthly':
        return startOfMonthUtc(reference);
      default:
        return startOfDayUtc(reference);
    }
  };

  const addInterval = (value: Date, count: number): Date => {
    switch (interval) {
      case 'weekly':
        return addWeeksUtc(value, count);
      case 'monthly':
        return addMonthsUtc(value, count);
      default:
        return addDaysUtc(value, count);
    }
  };

  const endPeriodStart = computeStart(now);
  const fromStart = addInterval(endPeriodStart, -1 * (clampedPeriods - 1));

  const intervalUnitMap: Record<RevenueInterval, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
  };

  const intervalUnit = intervalUnitMap[interval];
  const rawRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`date_trunc('${intervalUnit}', o."createdAt")`)} AS "period",
        SUM(oi.quantity) AS "productsCount"
      FROM "order_items" oi
      INNER JOIN "orders" o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${fromStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  )) as Array<{
    period: Date;
    productsCount: unknown;
  }>;

  const bucketMap = new Map<string, number>();
  rawRows.forEach((row) => {
    const bucketKey = new Date(row.period).toISOString();
    bucketMap.set(bucketKey, toNumber(row.productsCount));
  });

  const points: ProductsSeriesPoint[] = [];
  for (let index = 0; index < clampedPeriods; index += 1) {
    const periodStart = addInterval(fromStart, index);
    const periodEnd = addInterval(periodStart, 1);
    const key = periodStart.toISOString();
    const productsCount = bucketMap.get(key) ?? 0;

    points.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      productsCount,
    });
  }

  return {
    interval,
    periods: clampedPeriods,
    from: fromStart.toISOString(),
    to: addInterval(fromStart, clampedPeriods).toISOString(),
    points,
  };
}

export async function fetchBasketDepthSeries(params: {
  interval: RevenueInterval;
  periods: number;
}): Promise<{
  interval: RevenueInterval;
  periods: number;
  from: string;
  to: string;
  points: BasketDepthSeriesPoint[];
}> {
  const interval = params.interval;
  const clampedPeriods = clampNumber(params.periods, 1, 180);
  const now = new Date();

  const computeStart = (reference: Date): Date => {
    switch (interval) {
      case 'weekly':
        return startOfWeekUtc(reference);
      case 'monthly':
        return startOfMonthUtc(reference);
      default:
        return startOfDayUtc(reference);
    }
  };

  const addInterval = (value: Date, count: number): Date => {
    switch (interval) {
      case 'weekly':
        return addWeeksUtc(value, count);
      case 'monthly':
        return addMonthsUtc(value, count);
      default:
        return addDaysUtc(value, count);
    }
  };

  const endPeriodStart = computeStart(now);
  const fromStart = addInterval(endPeriodStart, -1 * (clampedPeriods - 1));

  const intervalUnitMap: Record<RevenueInterval, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
  };

  const intervalUnit = intervalUnitMap[interval];
  const rawRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        ${Prisma.raw(`date_trunc('${intervalUnit}', o."createdAt")`)} AS "period",
        COUNT(DISTINCT o.id) AS "ordersCount",
        SUM(oi.quantity) AS "totalProducts"
      FROM "order_items" oi
      INNER JOIN "orders" o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${fromStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  )) as Array<{
    period: Date;
    ordersCount: unknown;
    totalProducts: unknown;
  }>;

  const bucketMap = new Map<string, { ordersCount: number; totalProducts: number }>();
  rawRows.forEach((row) => {
    const bucketKey = new Date(row.period).toISOString();
    const ordersCount = toNumber(row.ordersCount);
    const totalProducts = toNumber(row.totalProducts);
    bucketMap.set(bucketKey, { ordersCount, totalProducts });
  });

  const points: BasketDepthSeriesPoint[] = [];
  for (let index = 0; index < clampedPeriods; index += 1) {
    const periodStart = addInterval(fromStart, index);
    const periodEnd = addInterval(periodStart, 1);
    const key = periodStart.toISOString();
    const bucket = bucketMap.get(key) ?? { ordersCount: 0, totalProducts: 0 };
    const averageBasketDepth = bucket.ordersCount > 0 ? bucket.totalProducts / bucket.ordersCount : 0;

    points.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      averageBasketDepth,
    });
  }

  return {
    interval,
    periods: clampedPeriods,
    from: fromStart.toISOString(),
    to: addInterval(fromStart, clampedPeriods).toISOString(),
    points,
  };
}

export async function fetchCrmUsers(params: CrmUsersParams): Promise<CrmUsersResponse> {
  const page = clampNumber(Math.floor(params.page) || 1, 1, 1000);
  const pageSize = clampNumber(Math.floor(params.pageSize) || 20, 5, 100);
  const searchTerm = params.search?.trim() ?? '';

  const orConditions: Array<Record<string, unknown>> = [];

  if (searchTerm) {
    orConditions.push(
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { username: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
    );

    const numericSearch = Number(searchTerm);
    if (!Number.isNaN(numericSearch)) {
      try {
        orConditions.push({
          telegramId: BigInt(Math.trunc(numericSearch)),
        });
      } catch {
        // ignore overflow - impossible to match anyway
      }
    }
  }

  const where = orConditions.length > 0 ? { OR: orConditions } : undefined;

  const sortOption = params.sort ?? 'spent_desc';
  const orderBy = (() => {
    switch (sortOption) {
      case 'spent_asc':
        return { totalSpent: 'asc' } as const;
      case 'newest':
        return { createdAt: 'desc' } as const;
      case 'oldest':
        return { createdAt: 'asc' } as const;
      case 'last_active':
        return { lastLoginAt: 'desc' } as const;
      case 'bonuses_desc':
        return { bonusPoints: 'desc' } as const;
      case 'spent_desc':
      default:
        return { totalSpent: 'desc' } as const;
    }
  })();

  const skip = (page - 1) * pageSize;

  const [total, usersRaw] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        bonusPoints: true,
        totalSpent: true,
        createdAt: true,
        lastLoginAt: true,
        orders: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    }),
  ]);

  const users = usersRaw as CrmUserListItem[];

  const userIds = users.map(user => user.id);
  let deliveredCounts: Array<{ userId: string; _count: { _all: number } }> = [];
  if (userIds.length) {
    const deliveredCountsResult = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'DELIVERED',
      },
      _count: { _all: true },
    });
    deliveredCounts = deliveredCountsResult as Array<{ userId: string; _count: { _all: number } }>;
  }

  const deliveredMap = new Map<string, number>(
    deliveredCounts.map((item: { userId: string; _count: { _all: number } }) => [item.userId, item._count._all ?? 0])
  );

  const now = new Date();

  const items = users.map((user: CrmUserListItem) => {
    const deliveredOrders = deliveredMap.get(user.id) ?? 0;
    const avgOrderValue =
      deliveredOrders > 0 ? Number(user.totalSpent) / deliveredOrders : 0;
    const lastOrder = user.orders[0];

    // Вычисляем дни с регистрации
    const daysSinceRegistration = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Вычисляем дни с последнего заказа
    const daysSinceLastOrder = lastOrder
      ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Определяем сегмент клиента
    const segment = getCustomerSegment(
      Number(user.totalSpent),
      user._count.orders,
      daysSinceRegistration,
      daysSinceLastOrder
    );

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      name: buildUserDisplayName(user),
      username: user.username,
      phone: user.phone,
      bonusPoints: user.bonusPoints,
      totalSpent: Number(user.totalSpent),
      ordersCount: user._count.orders,
      deliveredOrders,
      averageOrderValue: avgOrderValue,
      segment,
      lastOrder: lastOrder
        ? {
            id: lastOrder.id,
            orderNumber: lastOrder.orderNumber,
            status: lastOrder.status,
            totalAmount: Number(lastOrder.totalAmount),
            createdAt: lastOrder.createdAt.toISOString(),
          }
        : null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
    };
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    items,
  };
}

export async function fetchCrmUserDetails(userId: string): Promise<CrmUserDetails | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      bonusPoints: true,
      totalSpent: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const [
    ordersAggregate,
    deliveredAggregate,
    firstOrder,
    lastOrder,
    recentOrdersRaw,
    bonusHistoryRaw,
    bonusSummaryRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: {
        totalAmount: true,
        bonusUsed: true,
        bonusEarned: true,
      },
    }),
    prisma.order.aggregate({
      where: { userId, status: 'DELIVERED' },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        orderNumber: true,
        totalAmount: true,
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        deliveryCost: true,
        bonusUsed: true,
        bonusEarned: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.bonusTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
        orderId: true,
      },
    }),
    prisma.bonusTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  const recentOrdersList = recentOrdersRaw as RecentOrder[];
  const bonusHistoryList = bonusHistoryRaw as BonusHistoryGroup[];
  const bonusSummaryGroups = bonusSummaryRaw as Array<{ type: string; _sum: { amount: unknown } }>;

  const bonusSummary = {
    EARNED: 0,
    SPENT: 0,
    GIFT: 0,
    EXPIRED: 0,
    REFUND: 0,
  } as Record<string, number>;

  bonusSummaryGroups.forEach((item) => {
    bonusSummary[item.type] = toNumber(item._sum.amount);
  });

  const deliveredOrdersCount = deliveredAggregate._count._all ?? 0;
  const deliveredRevenue = toNumber(deliveredAggregate._sum.totalAmount);

  return {
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bonusPoints: user.bonusPoints,
      totalSpent: Number(user.totalSpent),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
    },
    stats: {
      totalOrders: ordersAggregate._count._all ?? 0,
      deliveredOrders: deliveredOrdersCount,
      totalRevenue: toNumber(ordersAggregate._sum.totalAmount),
      deliveredRevenue,
      averageOrderValue: deliveredOrdersCount > 0 ? deliveredRevenue / deliveredOrdersCount : 0,
      totalBonusEarned: bonusSummary.EARNED,
      totalBonusSpent: bonusSummary.SPENT,
      totalBonusRefunded: bonusSummary.REFUND,
      totalBonusGifted: bonusSummary.GIFT,
      firstOrderAt: firstOrder?.createdAt?.toISOString() ?? null,
      lastOrderAt: lastOrder?.createdAt?.toISOString() ?? null,
      lastOrderNumber: lastOrder?.orderNumber ?? null,
      lastOrderTotal: lastOrder ? Number(lastOrder.totalAmount) : null,
    },
    recentOrders: recentOrdersList.map((order: RecentOrder) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      deliveryCost: Number(order.deliveryCost),
      bonusUsed: order.bonusUsed,
      bonusEarned: order.bonusEarned,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    })),
    bonusHistory: bonusHistoryList.map((tx: BonusHistoryGroup) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
      orderId: tx.orderId,
    })),
  };
}
