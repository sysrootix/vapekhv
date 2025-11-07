import { prisma } from '../config/database';

export interface OrderTimeAnalysis {
  byHour: Array<{ hour: number; ordersCount: number; revenue: number }>;
  byDayOfWeek: Array<{ day: number; dayName: string; ordersCount: number; revenue: number }>;
}

export interface BonusAnalysis {
  earned: number;
  spent: number;
  active: number;
  utilizationRate: number;
  topEarners: Array<{ userId: string; telegramId: string; name: string | null; earned: number }>;
}

export interface RepeatPurchaseAnalysis {
  firstTimeBuyers: number;
  repeatBuyers: number;
  repeatRate: number;
  averageOrdersPerRepeatBuyer: number;
  revenueFromRepeatBuyers: number;
  revenueFromFirstTimeBuyers: number;
}

export interface RFMAnalysis {
  segments: Array<{
    segment: string;
    description: string;
    count: number;
    avgRevenue: number;
    avgOrders: number;
  }>;
}

// Анализ времени заказов
export async function getOrderTimeAnalysis(): Promise<OrderTimeAnalysis> {
  const orders = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  const byHourMap = new Map<number, { ordersCount: number; revenue: number }>();
  const byDayMap = new Map<number, { ordersCount: number; revenue: number }>();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const hour = date.getUTCHours();
    const dayOfWeek = date.getUTCDay();

    // По часам
    if (!byHourMap.has(hour)) {
      byHourMap.set(hour, { ordersCount: 0, revenue: 0 });
    }
    const hourData = byHourMap.get(hour)!;
    hourData.ordersCount++;
    hourData.revenue += Number(order.totalAmount);

    // По дням недели
    if (!byDayMap.has(dayOfWeek)) {
      byDayMap.set(dayOfWeek, { ordersCount: 0, revenue: 0 });
    }
    const dayData = byDayMap.get(dayOfWeek)!;
    dayData.ordersCount++;
    dayData.revenue += Number(order.totalAmount);
  });

  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  return {
    byHour: Array.from({ length: 24 }, (_, i) => {
      const data = byHourMap.get(i) || { ordersCount: 0, revenue: 0 };
      return { hour: i, ...data };
    }),
    byDayOfWeek: Array.from({ length: 7 }, (_, i) => {
      const data = byDayMap.get(i) || { ordersCount: 0, revenue: 0 };
      return { day: i, dayName: dayNames[i], ...data };
    }),
  };
}

// Анализ бонусов
export async function getBonusAnalysis(): Promise<BonusAnalysis> {
  const [earned, spent, users] = await Promise.all([
    prisma.bonusTransaction.aggregate({
      where: { type: 'EARNED' },
      _sum: { amount: true },
    }),
    prisma.bonusTransaction.aggregate({
      where: { type: 'SPENT' },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      where: { bonusPoints: { gt: 0 } },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        bonusPoints: true,
      },
    }),
  ]);

  const totalEarned = Number(earned._sum.amount || 0);
  const totalSpent = Number(spent._sum.amount || 0);
  const activeBonusPoints = users.reduce((sum, u) => sum + u.bonusPoints, 0);
  const utilizationRate = totalEarned > 0 ? (totalSpent / totalEarned) * 100 : 0;

  const topEarners = users
    .map((u) => ({
      userId: u.id,
      telegramId: u.telegramId.toString(),
      name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName || u.username || null,
      earned: u.bonusPoints,
    }))
    .sort((a, b) => b.earned - a.earned)
    .slice(0, 10);

  return {
    earned: totalEarned,
    spent: totalSpent,
    active: activeBonusPoints,
    utilizationRate,
    topEarners,
  };
}

// Анализ повторных покупок
export async function getRepeatPurchaseAnalysis(): Promise<RepeatPurchaseAnalysis> {
  const users = await prisma.user.findMany({
    where: {
      orders: {
        some: {
          status: 'DELIVERED',
        },
      },
    },
    select: {
      id: true,
      orders: {
        where: { status: 'DELIVERED' },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  let firstTimeBuyers = 0;
  let repeatBuyers = 0;
  let totalOrdersFromRepeatBuyers = 0;
  let revenueFromRepeatBuyers = 0;
  let revenueFromFirstTimeBuyers = 0;

  users.forEach((user) => {
    const orders = user.orders;
    if (orders.length === 0) return;

    const firstOrder = orders[0];
    const isRepeatBuyer = orders.length > 1;

    if (isRepeatBuyer) {
      repeatBuyers++;
      totalOrdersFromRepeatBuyers += orders.length;
      revenueFromRepeatBuyers += orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    } else {
      firstTimeBuyers++;
      revenueFromFirstTimeBuyers += Number(firstOrder.totalAmount);
    }
  });

  const totalBuyers = firstTimeBuyers + repeatBuyers;
  const repeatRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;
  const averageOrdersPerRepeatBuyer = repeatBuyers > 0 ? totalOrdersFromRepeatBuyers / repeatBuyers : 0;

  return {
    firstTimeBuyers,
    repeatBuyers,
    repeatRate,
    averageOrdersPerRepeatBuyer,
    revenueFromRepeatBuyers,
    revenueFromFirstTimeBuyers,
  };
}

// RFM анализ
export async function getRFMAnalysis(): Promise<RFMAnalysis> {
  const users = await prisma.user.findMany({
    where: {
      orders: {
        some: {
          status: 'DELIVERED',
        },
      },
    },
    select: {
      id: true,
      orders: {
        where: { status: 'DELIVERED' },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });

  const now = new Date();
  const segments: Array<{ segment: string; description: string; count: number; avgRevenue: number; avgOrders: number }> = [];

  const champions: Array<{ revenue: number; orders: number }> = [];
  const loyal: Array<{ revenue: number; orders: number }> = [];
  const potential: Array<{ revenue: number; orders: number }> = [];
  const newCustomers: Array<{ revenue: number; orders: number }> = [];
  const atRisk: Array<{ revenue: number; orders: number }> = [];

  users.forEach((user) => {
    const orders = user.orders;
    if (orders.length === 0) return;

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const ordersCount = orders.length;
    const lastOrderDate = new Date(orders[orders.length - 1].createdAt);
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    const data = { revenue: totalRevenue, orders: ordersCount };

    if (ordersCount >= 5 && daysSinceLastOrder <= 30) {
      champions.push(data);
    } else if (ordersCount >= 3 && daysSinceLastOrder <= 60) {
      loyal.push(data);
    } else if (ordersCount === 1 && daysSinceLastOrder <= 30) {
      newCustomers.push(data);
    } else if (ordersCount >= 2 && daysSinceLastOrder > 60) {
      atRisk.push(data);
    } else {
      potential.push(data);
    }
  });

  const calculateAvg = (arr: Array<{ revenue: number; orders: number }>) => ({
    avgRevenue: arr.length > 0 ? arr.reduce((sum, u) => sum + u.revenue, 0) / arr.length : 0,
    avgOrders: arr.length > 0 ? arr.reduce((sum, u) => sum + u.orders, 0) / arr.length : 0,
  });

  segments.push(
    { segment: 'Champions', description: 'Частые и недавние покупки', count: champions.length, ...calculateAvg(champions) },
    { segment: 'Loyal', description: 'Регулярные покупатели', count: loyal.length, ...calculateAvg(loyal) },
    { segment: 'Potential', description: 'Потенциальные лояльные', count: potential.length, ...calculateAvg(potential) },
    { segment: 'New', description: 'Новые клиенты', count: newCustomers.length, ...calculateAvg(newCustomers) },
    { segment: 'At Risk', description: 'Риск потери', count: atRisk.length, ...calculateAvg(atRisk) }
  );

  return { segments };
}

