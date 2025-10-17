import { apiClient } from './client';
import { Product } from './product';

export interface CartItem {
  id: string;
  quantity: number;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
  count: number;
}

export const cartApi = {
  getCart: async (): Promise<CartResponse> => {
    const response = await apiClient.get<CartResponse>('/cart');
    return response.data;
  },

  addToCart: async (productId: string, quantity: number = 1, selectedOptions?: Record<string, string>): Promise<CartItem> => {
    const response = await apiClient.post<CartItem>('/cart/add', { 
      productId, 
      quantity,
      selectedOptions,
    });
    return response.data;
  },

  updateCartItem: async (id: string, quantity: number): Promise<CartItem> => {
    const response = await apiClient.put<CartItem>(`/cart/${id}`, { quantity });
    return response.data;
  },

  removeFromCart: async (id: string): Promise<void> => {
    await apiClient.delete(`/cart/${id}`);
  },

  clearCart: async (): Promise<void> => {
    await apiClient.delete('/cart');
  },
};

