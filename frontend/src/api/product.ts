import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  _count?: {
    products: number;
  };
}

export interface ProductCharacteristic {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  price?: number;
  stockCount: number;
  inStock: boolean;
  characteristics: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  images: string[];
  inStock: boolean;
  stockCount: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  characteristics?: ProductCharacteristic[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export const productApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },

  getProducts: async (params?: {
    categoryId?: string;
    search?: string;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: string;
    minPrice?: string;
    maxPrice?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/products', { params });
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  // Stock notifications
  subscribeToStockNotification: async (productId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/products/${productId}/notify`);
    return response.data;
  },

  unsubscribeFromStockNotification: async (productId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/products/${productId}/notify`);
    return response.data;
  },

  checkStockNotificationSubscription: async (productId: string): Promise<{ subscribed: boolean }> => {
    const response = await apiClient.get(`/products/${productId}/notify/check`);
    return response.data;
  },
};

