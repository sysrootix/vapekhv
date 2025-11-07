import { apiClient } from './client';

export interface Review {
  id: string;
  rating: number;
  text: string | null;
  images: string[];
  videos: string[];
  userId: string;
  productId: string;
  orderId: string | null;
  bonusAwarded: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
  };
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
    price?: number;
  };
}

export interface ProductRating {
  rating: number;
  reviewCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
}

export interface PendingReviewProduct {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  productPrice: number;
  orderId: string;
  orderNumber: string;
  orderDate: string;
}

export interface CreateReviewData {
  productId: string;
  orderId?: string;
  rating: number;
  text?: string;
  images?: string[];
  videos?: string[];
}

export const reviewApi = {
  // Создать отзыв
  createReview: async (data: CreateReviewData): Promise<Review> => {
    const response = await apiClient.post<Review>('/reviews', data);
    return response.data;
  },

  // Получить случайные отзывы
  getRandomReviews: async (limit: number = 3): Promise<{ reviews: Review[] }> => {
    const response = await apiClient.get<{ reviews: Review[] }>('/reviews/random', {
      params: { limit },
    });
    return response.data;
  },

  // Получить все отзывы
  getAllReviews: async (params?: { limit?: number; offset?: number }): Promise<ReviewsResponse> => {
    const response = await apiClient.get<ReviewsResponse>('/reviews/all', { params });
    return response.data;
  },

  // Получить отзывы товара
  getProductReviews: async (
    productId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ReviewsResponse> => {
    const response = await apiClient.get<ReviewsResponse>(`/reviews/product/${productId}`, { params });
    return response.data;
  },

  // Получить рейтинг товара
  getProductRating: async (productId: string): Promise<ProductRating> => {
    const response = await apiClient.get<ProductRating>(`/reviews/product/${productId}/rating`);
    return response.data;
  },

  // Получить товары, на которые можно оставить отзыв
  getPendingReviews: async (): Promise<{ products: PendingReviewProduct[] }> => {
    const response = await apiClient.get<{ products: PendingReviewProduct[] }>('/reviews/pending');
    return response.data;
  },
};

