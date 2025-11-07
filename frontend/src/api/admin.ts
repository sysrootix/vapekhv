import { apiClient } from './client';
import { Order, OrderStatus } from './order';

export interface AdminOrderUser {
  id: string;
  telegramId: string | number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bonusPoints: number;
}

export interface AdminOrder extends Order {
  user: AdminOrderUser;
}

export interface AdminAccess {
  role: 'ADMIN' | 'CRM' | 'NONE';
  permissions: {
    manageOrders: boolean;
    viewCrm: boolean;
  };
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
  topCustomers: Array<{
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
  }>;
  topProducts: Array<{
    id: string;
    name: string | null;
    imageUrl: string | null;
    totalQuantity: number;
    totalRevenue: number;
    orderLines: number;
  }>;
}

export interface RevenueSeries {
  interval: 'daily' | 'weekly' | 'monthly';
  periods: number;
  from: string;
  to: string;
  points: Array<{
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    ordersCount: number;
  }>;
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

export interface NewUsersSeries {
  interval: 'daily' | 'weekly' | 'monthly';
  periods: number;
  from: string;
  to: string;
  points: Array<{
    periodStart: string;
    periodEnd: string;
    usersCount: number;
  }>;
}

export interface OrdersSeries {
  interval: 'daily' | 'weekly' | 'monthly';
  periods: number;
  from: string;
  to: string;
  points: Array<{
    periodStart: string;
    periodEnd: string;
    ordersCount: number;
  }>;
}

export interface ProductsSeries {
  interval: 'daily' | 'weekly' | 'monthly';
  periods: number;
  from: string;
  to: string;
  points: Array<{
    periodStart: string;
    periodEnd: string;
    productsCount: number;
  }>;
}

export interface BasketDepthSeries {
  interval: 'daily' | 'weekly' | 'monthly';
  periods: number;
  from: string;
  to: string;
  points: Array<{
    periodStart: string;
    periodEnd: string;
    averageBasketDepth: number;
  }>;
}

export interface CohortData {
  cohorts: Array<{
    cohort: string;
    usersCount: number;
    totalRevenue: number;
    activeUsers: number;
    avgRevenue: number;
    averageOrderValue: number;
    retentionRate: number;
  }>;
}

export interface LTVData {
  totalCustomers: number;
  averageLTV: number;
  totalLTV: number;
  segments: {
    new: { count: number; avgLTV: number; totalLTV: number };
    active: { count: number; avgLTV: number; totalLTV: number };
    loyal: { count: number; avgLTV: number; totalLTV: number };
  };
}

export interface TopProductsData {
  products: Array<{
    productId: string;
    name: string;
    imageUrl: string | null;
    currentPrice: number;
    totalQuantity: number;
    totalRevenue: number;
    ordersCount: number;
  }>;
}

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

export interface AudienceFilters {
  telegramIds?: string[];
  includeUserIds?: string[];
  excludeUserIds?: string[];
  hasTelegramUsername?: boolean;
  usernameContains?: string;
  hasPhone?: boolean;
  isPremium?: boolean;
  hasOrders?: boolean;
  bonusPointsMin?: number;
  bonusPointsMax?: number;
  totalSpentMin?: number;
  totalSpentMax?: number;
  ordersCountMin?: number;
  ordersCountMax?: number;
  daysSinceLastOrderMin?: number;
  daysSinceLastOrderMax?: number;
  daysSinceLastLoginMin?: number;
  daysSinceLastLoginMax?: number;
  daysSinceRegistrationMin?: number;
  daysSinceRegistrationMax?: number;
}

export interface AudienceListItem {
  id: string;
  name: string;
  description?: string | null;
  userCount: number;
  lastEvaluatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceDetails extends AudienceListItem {
  filters: AudienceFilters;
}

export interface AudiencePreviewUser {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  bonusPoints: number;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  daysSinceLastLogin: number;
  daysSinceRegistration: number;
}

export interface AudiencePreviewResponse {
  filters: AudienceFilters;
  totalUsers: number;
  users: AudiencePreviewUser[];
}

export interface AudienceMutationResponse {
  audience: AudienceDetails;
  preview: AudiencePreviewUser[];
  totalUsers: number;
}

export interface AudiencePayload {
  name: string;
  description?: string;
  filters: AudienceFilters;
}

export interface BroadcastButton {
  text: string;
  type: 'url' | 'web_app' | 'callback';
  value: string;
}

export interface BroadcastMedia {
  type: 'photo' | 'video' | 'document';
  fileId?: string;
  url?: string;
  caption?: string;
}

export interface BroadcastMessage {
  text: string;
  media?: BroadcastMedia;
  buttons?: BroadcastButton[][];
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface BroadcastTarget {
  userIds?: string[];
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

export interface BroadcastStats {
  totalUsers: number;
  segmentBreakdown?: Record<string, number>;
}

export interface UpdateCrmUserPayload {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;
  bonusPoints?: number;
}

export const adminApi = {
  getAccess: async (): Promise<AdminAccess> => {
    const response = await apiClient.get<AdminAccess>('/admin/access');
    return response.data;
  },

  getOrders: async (status?: OrderStatus): Promise<AdminOrder[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<AdminOrder[]>('/admin/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, adminDeliveryCost?: number): Promise<AdminOrder> => {
    const response = await apiClient.put<AdminOrder>(`/admin/orders/${orderId}/status`, {
      status,
      adminDeliveryCost,
    });
    return response.data;
  },

  getStats: async (): Promise<{
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
  }> => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  getCrmOverview: async (params?: {
    rangeDays?: number;
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
  }): Promise<CrmOverview> => {
    const response = await apiClient.get<CrmOverview>('/admin/crm/overview', {
      params: params || { rangeDays: 30 },
    });
    return response.data;
  },

  getRevenueSeries: async (interval: RevenueSeries['interval'], periods: number): Promise<RevenueSeries> => {
    const response = await apiClient.get<RevenueSeries>('/admin/crm/revenue', {
      params: { interval, periods },
    });
    return response.data;
  },

  getCrmUsers: async (params: {
    search?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CrmUsersResponse> => {
    const response = await apiClient.get<CrmUsersResponse>('/admin/crm/users', { params });
    return response.data;
  },

  getCrmUserDetails: async (userId: string): Promise<CrmUserDetails> => {
    const response = await apiClient.get<CrmUserDetails>(`/admin/crm/users/${userId}`);
    return response.data;
  },

  getNewUsersSeries: async (interval: NewUsersSeries['interval'], periods: number): Promise<NewUsersSeries> => {
    const response = await apiClient.get<NewUsersSeries>('/admin/crm/new-users', {
      params: { interval, periods },
    });
    return response.data;
  },

  getOrdersSeries: async (interval: OrdersSeries['interval'], periods: number): Promise<OrdersSeries> => {
    const response = await apiClient.get<OrdersSeries>('/admin/crm/orders', {
      params: { interval, periods },
    });
    return response.data;
  },

  getProductsSeries: async (interval: ProductsSeries['interval'], periods: number): Promise<ProductsSeries> => {
    const response = await apiClient.get<ProductsSeries>('/admin/crm/products', {
      params: { interval, periods },
    });
    return response.data;
  },

  getBasketDepthSeries: async (interval: BasketDepthSeries['interval'], periods: number): Promise<BasketDepthSeries> => {
    const response = await apiClient.get<BasketDepthSeries>('/admin/crm/basket-depth', {
      params: { interval, periods },
    });
    return response.data;
  },

  getCohorts: async (): Promise<CohortData> => {
    const response = await apiClient.get<CohortData>('/admin/crm/cohorts');
    return response.data;
  },

  getLTV: async (): Promise<LTVData> => {
    const response = await apiClient.get<LTVData>('/admin/crm/ltv');
    return response.data;
  },

  getTopProducts: async (): Promise<TopProductsData> => {
    const response = await apiClient.get<TopProductsData>('/admin/crm/top-products');
    return response.data;
  },

  getOrderTimeAnalysis: async (): Promise<OrderTimeAnalysis> => {
    const response = await apiClient.get<OrderTimeAnalysis>('/admin/crm/order-time-analysis');
    return response.data;
  },

  getBonusAnalysis: async (): Promise<BonusAnalysis> => {
    const response = await apiClient.get<BonusAnalysis>('/admin/crm/bonus-analysis');
    return response.data;
  },

  getRepeatPurchaseAnalysis: async (): Promise<RepeatPurchaseAnalysis> => {
    const response = await apiClient.get<RepeatPurchaseAnalysis>('/admin/crm/repeat-purchase-analysis');
    return response.data;
  },

  getRFMAnalysis: async (): Promise<RFMAnalysis> => {
    const response = await apiClient.get<RFMAnalysis>('/admin/crm/rfm-analysis');
    return response.data;
  },

  getAudiences: async (): Promise<AudienceListItem[]> => {
    const response = await apiClient.get<{ items: AudienceListItem[] }>('/admin/crm/audiences');
    return response.data.items;
  },

  getAudience: async (audienceId: string): Promise<{ audience: AudienceDetails }> => {
    const response = await apiClient.get<{ audience: AudienceDetails }>(`/admin/crm/audiences/${audienceId}`);
    return response.data;
  },

  createAudience: async (payload: AudiencePayload): Promise<AudienceMutationResponse> => {
    const response = await apiClient.post<AudienceMutationResponse>('/admin/crm/audiences', payload);
    return response.data;
  },

  updateAudience: async (audienceId: string, payload: AudiencePayload): Promise<AudienceMutationResponse> => {
    const response = await apiClient.put<AudienceMutationResponse>(`/admin/crm/audiences/${audienceId}`, payload);
    return response.data;
  },

  deleteAudience: async (audienceId: string): Promise<void> => {
    await apiClient.delete(`/admin/crm/audiences/${audienceId}`);
  },

  previewAudienceFilters: async (filters: AudienceFilters): Promise<AudiencePreviewResponse> => {
    const response = await apiClient.post<AudiencePreviewResponse>('/admin/crm/audiences/preview', { filters });
    return response.data;
  },

  previewSavedAudience: async (audienceId: string): Promise<{
    audience: AudienceDetails;
    preview: AudiencePreviewResponse;
  }> => {
    const response = await apiClient.get<{ audience: AudienceDetails; preview: AudiencePreviewResponse }>(
      `/admin/crm/audiences/${audienceId}/preview`
    );
    return response.data;
  },

  updateCrmUser: async (userId: string, payload: UpdateCrmUserPayload): Promise<CrmUserDetails> => {
    const response = await apiClient.patch<CrmUserDetails>(`/admin/crm/users/${userId}`, payload);
    return response.data;
  },

  getBroadcastStats: async (target: BroadcastTarget): Promise<BroadcastStats> => {
    const response = await apiClient.post<BroadcastStats>('/admin/crm/broadcast/stats', target);
    return response.data;
  },

  sendBroadcast: async (message: BroadcastMessage, target: BroadcastTarget): Promise<BroadcastResult> => {
    const response = await apiClient.post<BroadcastResult>('/admin/crm/broadcast/send', { message, target });
    return response.data;
  },
};
