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

  getCrmOverview: async (rangeDays = 30): Promise<CrmOverview> => {
    const response = await apiClient.get<CrmOverview>('/admin/crm/overview', {
      params: { rangeDays },
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
};
