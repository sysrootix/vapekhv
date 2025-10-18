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
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryCost: number;
  adminDeliveryCost?: number;
  bonusUsed: number;
  bonusEarned: number;
  userId: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  comment?: string;
  receiptImageUrl?: string;
  paymentExpiresAt?: string;
  paidAt?: string;
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

  uploadReceipt: async (orderId: string, file: File): Promise<Order> => {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await apiClient.post<Order>(`/orders/${orderId}/upload-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  },

  confirmDelivery: async (id: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${id}/confirm-delivery`);
    return response.data;
  },

  repeatOrder: async (id: string): Promise<{ message: string; addedItems: any[]; unavailableItems: string[]; cart: any }> => {
    const response = await apiClient.post(`/orders/${id}/repeat`);
    return response.data;
  },
};
