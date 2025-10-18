import { prisma } from '../config/database';

type RevenueInterval = 'daily' | 'weekly' | 'monthly';

interface RevenueSeriesPoint {
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  ordersCount: number;
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
  rangeDays: number;
  metrics: {
    totalUsers: number;
    newUsers7d: number;
    activeUsers30d: number;
    payingUsers: number;
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    revenueRange: number;
    averageOrderValue: number;
    ordersPerPayingUser: number;
    totalBonusEarned: number;
    totalBonusSpent: number;
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

export async function fetchCrmOverview(rangeDays = 30): Promise<CrmOverview> {
  const clampedRange = clampNumber(rangeDays, 1, 365);
  const generatedAt = new Date();
  const rangeStart = startOfDayUtc(addDaysUtc(generatedAt, -1 * (clampedRange - 1)));
  const activeStart = addDaysUtc(generatedAt, -30);
  const newUsersStart = addDaysUtc(generatedAt, -6);

  const [
    totalUsers,
    newUsers7d,
    activeUsers30d,
    payingUsers,
    totalOrders,
    pendingOrders,
    processingOrders,
    deliveredOrders,
    totalRevenueAgg,
    rangeRevenueAgg,
    bonusSummaryRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfDayUtc(newUsersStart),
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
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: rangeStart,
        },
      },
      _sum: { totalAmount: true },
    }),
    prisma.bonusTransaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = toNumber(totalRevenueAgg._sum.totalAmount);
  const rangeRevenue = toNumber(rangeRevenueAgg._sum.totalAmount);
  const averageOrderValue = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;
  const ordersPerPayingUser = payingUsers > 0 ? deliveredOrders / payingUsers : 0;

  const bonusSummary = {
    EARNED: 0,
    SPENT: 0,
    GIFT: 0,
    EXPIRED: 0,
    REFUND: 0,
  } as Record<string, number>;

  const bonusGroups = bonusSummaryRaw as Array<{ type: string; _sum: { amount: unknown } }>;

  bonusGroups.forEach(item => {
    bonusSummary[item.type] = toNumber(item._sum.amount);
  });

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
    rangeDays: clampedRange,
    metrics: {
      totalUsers,
      newUsers7d,
      activeUsers30d,
      payingUsers,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      totalRevenue,
      revenueRange: rangeRevenue,
      averageOrderValue,
      ordersPerPayingUser,
      totalBonusEarned: bonusSummary.EARNED,
      totalBonusSpent: bonusSummary.SPENT,
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

  const rawRows = (await prisma.$queryRaw`
    SELECT
      date_trunc('${intervalUnitMap[interval]}', "createdAt") AS "period",
      SUM("totalAmount") AS "totalAmount",
      COUNT(*) AS "ordersCount"
    FROM "orders"
    WHERE status = 'DELIVERED' AND "createdAt" >= ${fromStart}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as Array<{
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

  const items = users.map((user: CrmUserListItem) => {
    const deliveredOrders = deliveredMap.get(user.id) ?? 0;
    const avgOrderValue =
      deliveredOrders > 0 ? Number(user.totalSpent) / deliveredOrders : 0;
    const lastOrder = user.orders[0];

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
