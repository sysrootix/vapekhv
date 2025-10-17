import { apiClient } from './client';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    isPremium: boolean;
  };
}

export const authApi = {
  telegramLogin: async (initData: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/telegram', {
      initData,
    });
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean }> => {
    const response = await apiClient.get<{ valid: boolean }>('/auth/verify');
    return response.data;
  },
};

