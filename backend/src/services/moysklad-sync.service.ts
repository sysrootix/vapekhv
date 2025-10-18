import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { moySkladConfig } from '../config/moysklad';
import { moySkladAPI } from './moysklad.api';
import {
  MoySkladCashIn,
  MoySkladCounterparty,
  MoySkladCustomerOrder,
  MoySkladCustomerOrderPosition,
  MoySkladDemand,
  MoySkladDemandPosition,
  MoySkladMeta,
} from '../types/moysklad.types';

type OrderItemWithProduct = {
  id: string;
  quantity: number;
  price: number;
  selectedOptions: any;
  productId: string;
  product: {
    id: string;
    name: string;
    moySkladId: string | null;
  };
};

type OrderWithRelations = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  deliveryCost: number;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  deliveryDate: string | null;
  deliveryTime: string | null;
  adminDeliveryCost: number | null;
  comment: string | null;
  bonusUsed: number;
  bonusEarned: number;
  status: string;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
    totalSpent: number;
    bonusPoints: number;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    phone: string | null;
  telegramId: bigint | number | null;
  };
  items: OrderItemWithProduct[];
};

const buildMeta = (type: string, id: string): MoySkladMeta => ({
  href: `${moySkladConfig.apiUrl}/entity/${type}/${id}`,
  type,
  mediaType: 'application/json',
});

const formatMoySkladDate = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeDeliveryMoment = (dateInput: string | null, timeInput: string | null): string | undefined => {
  if (!dateInput) {
    return undefined;
  }

  let normalizedDate = dateInput.trim();
  if (!normalizedDate) {
    return undefined;
  }

  // Convert formats like DD.MM.YYYY to YYYY-MM-DD
  const dotDateMatch = normalizedDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotDateMatch) {
    const [, dd, mm, yyyy] = dotDateMatch;
    normalizedDate = `${yyyy}-${mm}-${dd}`;
  }

  let normalizedTime: string | undefined;
  if (timeInput) {
    const trimmedTime = timeInput.trim();
    if (!trimmedTime) {
      normalizedTime = undefined;
    } else if (/^\d{2}:\d{2}$/.test(trimmedTime)) {
      normalizedTime = `${trimmedTime}:00`;
    } else if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedTime)) {
      normalizedTime = trimmedTime;
    } else if (trimmedTime.includes('-')) {
      const firstPart = trimmedTime.split('-')[0].trim();
      if (/^\d{2}:\d{2}$/.test(firstPart)) {
        normalizedTime = `${firstPart}:00`;
      } else if (/^\d{2}:\d{2}:\d{2}$/.test(firstPart)) {
        normalizedTime = firstPart;
      }
    }
  }

  const isoCandidate = `${normalizedDate}T${normalizedTime ?? '00:00:00'}`;
  const parsed = new Date(isoCandidate);

  if (Number.isNaN(parsed.getTime())) {
    logger.warn(
      `Не удалось преобразовать дату доставки "${dateInput}" и время "${timeInput}" в ISO формат`
    );
    return undefined;
  }

  return formatMoySkladDate(parsed);
};

const formatHumanDateTime = (date?: Date | null): string => {
  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
};

export async function syncOrderWithMoySklad(order: OrderWithRelations): Promise<void> {
  const hasMoySkladConfig =
    Boolean(moySkladConfig.token) &&
    Boolean(moySkladConfig.organizationId) &&
    Boolean(moySkladConfig.storeId);

  if (!hasMoySkladConfig) {
    logger.warn('Интеграция с МойСклад пропущена: конфигурация неполная');
    return;
  }

  const organizationRef = { meta: buildMeta('organization', moySkladConfig.organizationId) };
  const storeRef = { meta: buildMeta('store', moySkladConfig.storeId) };
  const orderTotalCoins = Math.round(order.totalAmount * 100);

  const preferredPhone = order.deliveryPhone || order.user.phone || undefined;
  const counterpartyName =
    [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
    order.user.username ||
    (preferredPhone ? `Покупатель ${preferredPhone}` : `Покупатель ${order.userId}`);

  const bonusDiscountCoins = Math.max(0, Math.round(order.bonusUsed * 100));

  let counterparty: MoySkladCounterparty | null =
    await moySkladAPI.findCounterpartyByPhone(preferredPhone);

  if (!counterparty) {
    counterparty = await moySkladAPI.createCounterparty({
      name: counterpartyName,
      phone: preferredPhone,
      externalCode: order.user.telegramId
        ? `tg-${order.user.telegramId.toString()}`
        : `user-${order.userId}`,
      companyType: 'individual',
      actualAddress: order.deliveryAddress || undefined,
    });
  }

  if (!counterparty?.meta?.href) {
    throw new Error('Контрагент не содержит meta.href, невозможно создать заказ в МойСклад');
  }

  const agentReference = { meta: counterparty.meta };

  const [totalOrdersAgg, deliveredOrdersCount, firstOrderInfo, bonusSpentAgg] = await Promise.all([
    prisma.order.aggregate({
      _count: { _all: true },
      where: { userId: order.userId },
    }),
    prisma.order.count({
      where: { userId: order.userId, status: 'DELIVERED' },
    }),
    prisma.order.findFirst({
      where: { userId: order.userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, orderNumber: true },
    }),
    prisma.order.aggregate({
      _sum: { bonusUsed: true },
      where: { userId: order.userId },
    }),
  ]);

  const totalOrders = totalOrdersAgg._count._all;
  const totalBonusSpent = bonusSpentAgg._sum.bonusUsed ?? 0;

  const preparedItems = (
    await Promise.all(
      order.items.map(async (item): Promise<
        { quantity: number; price: number; assortmentMeta: MoySkladMeta } | null
      > => {
        const price = Math.round(item.price * 100);
        let assortmentMeta: MoySkladMeta | null = null;

        if (item.selectedOptions && typeof item.selectedOptions === 'object') {
          const variant = await prisma.productVariant.findFirst({
            where: {
              productId: item.productId,
              characteristics: {
                equals: item.selectedOptions,
              },
            },
            select: {
              moySkladId: true,
            },
          });

          if (variant?.moySkladId) {
            assortmentMeta = buildMeta('variant', variant.moySkladId);
          }
        }

        if (!assortmentMeta) {
          const productMoySkladId = item.product.moySkladId;
          if (productMoySkladId) {
            assortmentMeta = buildMeta('product', productMoySkladId);
          }
        }

        if (!assortmentMeta) {
          logger.warn(
            `Позиция "${item.product.name}" пропущена при создании заказа ${order.orderNumber} в МойСклад: отсутствует moySkladId`
          );
          return null;
        }

        return {
          quantity: item.quantity,
          price,
          assortmentMeta,
        };
      })
    )
  ).filter(
    (
      position
    ): position is { quantity: number; price: number; assortmentMeta: MoySkladMeta } =>
      position !== null
  );

  if (preparedItems.length === 0) {
    throw new Error(
      `Не удалось подготовить позиции заказа ${order.orderNumber} для отправки в МойСклад`
    );
  }

  const deliveryTotalRaw = order.adminDeliveryCost ?? order.deliveryCost ?? 0;
  const deliveryTotal = deliveryTotalRaw > 0 ? deliveryTotalRaw : 0;

  if (deliveryTotal > 0) {
    if (moySkladConfig.deliveryProductId) {
      preparedItems.push({
        quantity: 1,
        price: Math.round(deliveryTotal * 100),
        assortmentMeta: buildMeta('product', moySkladConfig.deliveryProductId),
      });
    } else {
      logger.warn(
        `Не указан MOYSKLAD_DELIVERY_PRODUCT_ID, позиция доставки не будет добавлена для заказа ${order.orderNumber}`
      );
    }
  }

  const customerOrderPositions: MoySkladCustomerOrderPosition[] = preparedItems.map(
    (position) => ({
      quantity: position.quantity,
      price: position.price,
      assortment: { meta: position.assortmentMeta },
    })
  );

  const deliveryMoment = normalizeDeliveryMoment(order.deliveryDate, order.deliveryTime);

  const userFullName =
    [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') ||
    order.user.username ||
    'Не указано';

  const descriptionLines = [
    'Заказ из Telegram WebApp.',
    `Адрес: ${order.deliveryAddress || '—'}`,
    `Время доставки: ${order.deliveryDate || '—'} ${order.deliveryTime || ''}`.trim(),
    `Комментарий: ${order.comment || '—'}`,
    `Админская стоимость доставки: ${
      order.adminDeliveryCost !== null && order.adminDeliveryCost !== undefined
        ? formatCurrency(order.adminDeliveryCost)
        : 'не указана'
    }`,
    `Оплата доставки в заказе: ${deliveryTotal > 0 ? formatCurrency(deliveryTotal) : 'не оплачена'}`,
    '',
    'Информация о клиенте:',
    `Имя: ${userFullName}`,
    `Телефон: ${preferredPhone || '—'}`,
    `Telegram: ${order.user.username ? `@${order.user.username}` : '—'} (ID: ${
      order.user.telegramId ? order.user.telegramId.toString() : order.userId
    })`,
    `Зарегистрирован: ${formatHumanDateTime(order.user.createdAt)}`,
    `Последний вход: ${formatHumanDateTime(order.user.lastLoginAt)}`,
    `Всего заказов: ${totalOrders}`,
    `Доставленных заказов: ${deliveredOrdersCount}`,
    `Первый заказ: ${
      firstOrderInfo?.createdAt
        ? `${formatHumanDateTime(firstOrderInfo.createdAt)} (${firstOrderInfo.orderNumber})`
        : '—'
    }`,
    `Всего потрачено: ${formatCurrency(order.user.totalSpent)}`,
    `Текущие бонусы: ${order.user.bonusPoints}`,
    `Бонусы списаны в заказе: ${order.bonusUsed}`,
    `Бонусы будут начислены: ${order.bonusEarned}`,
    `Бонусы списаны за всё время: ${totalBonusSpent}`,
  ].join('\n');

  const moyskladOrderPayload: MoySkladCustomerOrder = {
    name: order.orderNumber,
    moment: formatMoySkladDate(new Date()),
    organization: organizationRef,
    agent: {
      meta: agentReference.meta,
      name: counterparty.name || counterpartyName,
      phone: counterparty.phone || preferredPhone,
    },
    store: storeRef,
    sum: orderTotalCoins,
    description: descriptionLines,
    positions: customerOrderPositions,
    deliveryPlannedMoment: deliveryMoment,
    applicable: true,
    shipmentAddress: order.deliveryAddress || undefined,
    discount: bonusDiscountCoins > 0 ? { sum: bonusDiscountCoins } : undefined,
  };

  const moyskladOrder = await moySkladAPI.createCustomerOrder(moyskladOrderPayload);

  let demand: MoySkladDemand | null = null;
  try {
    const demandPositions: MoySkladDemandPosition[] = preparedItems.map((position) => ({
      quantity: position.quantity,
      price: position.price,
      assortment: { meta: position.assortmentMeta },
    }));

    const demandPayload: MoySkladDemand = {
      name: `${order.orderNumber}-отгрузка`,
      moment: formatMoySkladDate(new Date()),
      organization: organizationRef,
      agent: agentReference,
      store: storeRef,
      applicable: true,
      customerOrder: moyskladOrder.meta ? { meta: moyskladOrder.meta } : undefined,
      description: `Отгрузка по заказу ${order.orderNumber}`,
      positions: demandPositions,
    };

    demand = await moySkladAPI.createDemand(demandPayload);
  } catch (demandError) {
    logger.error('Ошибка при создании отгрузки в МойСклад:', demandError);
  }

  try {
    const operations =
      demand?.meta
        ? [{ meta: demand.meta, linkedSum: orderTotalCoins }]
        : moyskladOrder.meta
        ? [{ meta: moyskladOrder.meta, linkedSum: orderTotalCoins }]
        : undefined;

    const cashInPayload: MoySkladCashIn = {
      name: `${order.orderNumber}-оплата`,
      moment: formatMoySkladDate(new Date()),
      organization: organizationRef,
      agent: agentReference,
      sum: orderTotalCoins,
      description: `Оплата наличными за заказ ${order.orderNumber}`,
      operations,
    };

    await moySkladAPI.createCashIn(cashInPayload);
  } catch (cashInError) {
    logger.error('Ошибка при создании кассового ордера в МойСклад:', cashInError);
  }

  logger.info(`Заказ ${order.orderNumber} синхронизирован с МойСклад`);
}
