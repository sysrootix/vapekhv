import { apiClient } from './client';
import { Product } from './product';

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  selectedOptions?: Record<string, any>;
  productId: string;
  product: Product;
  orderId: string;
  createdAt: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryCost: number;
  bonusUsed: number;
  bonusEarned: number;
  userId: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  phone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  comment?: string;
  bonusToUse?: number;
}

export const orderApi = {
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders/create', data);
    return response.data;
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  },
};
