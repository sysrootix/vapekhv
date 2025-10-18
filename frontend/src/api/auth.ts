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
  telegramLogin: async (payload: { initData: string; referralCode?: string | null }): Promise<LoginResponse> => {
    const body: Record<string, unknown> = {
      initData: payload.initData,
    };

    if (payload.referralCode) {
      body.referralCode = payload.referralCode.trim().toUpperCase();
    }

    const response = await apiClient.post<LoginResponse>('/auth/telegram', body);
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean }> => {
    const response = await apiClient.get<{ valid: boolean }>('/auth/verify');
    return response.data;
  },
};
