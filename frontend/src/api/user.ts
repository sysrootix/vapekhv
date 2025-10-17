import { apiClient } from './client';

export interface UserProfile {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export const userApi = {
  getProfile: async (): Promise<{ user: UserProfile }> => {
    const response = await apiClient.get<{ user: UserProfile }>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { phone?: string }): Promise<{ user: UserProfile }> => {
    const response = await apiClient.put<{ user: UserProfile }>('/users/profile', data);
    return response.data;
  },
};

