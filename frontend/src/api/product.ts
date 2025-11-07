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
  rating?: number;
  reviewCount?: number;
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

  // Запрос на товар
  requestProduct: async (productRequest: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/products/request', { productRequest });
    return response.data;
  },

  // Отследить просмотр товара
  trackProductView: async (productId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/products/${productId}/view`);
    return response.data;
  },

  // Получить похожие товары
  getSimilarProducts: async (productId: string, limit?: number): Promise<{ products: Product[] }> => {
    const response = await apiClient.get(`/products/${productId}/similar`, {
      params: { limit },
    });
    return response.data;
  },

  // Получить недавно просмотренные товары
  getRecentProducts: async (limit?: number): Promise<{ products: Product[] }> => {
    const response = await apiClient.get('/products/recent', {
      params: { limit },
    });
    return response.data;
  },
};

