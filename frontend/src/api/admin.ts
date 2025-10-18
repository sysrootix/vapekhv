import { apiClient } from './client';
import { Order, OrderStatus } from './order';
import { UserProfile } from './user';

export interface AdminOrder extends Order {
  user: UserProfile;
}

export const adminApi = {
  // Получить все заказы (с фильтрацией по статусу)
  getOrders: async (status?: OrderStatus): Promise<AdminOrder[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<AdminOrder[]>('/admin/orders', { params });
    return response.data;
  },

  // Обновить статус заказа
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<AdminOrder> => {
    const response = await apiClient.put<AdminOrder>(`/admin/orders/${orderId}/status`, { status });
    return response.data;
  },

  // Получить статистику
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
};
