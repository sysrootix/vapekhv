import { apiClient } from './client';

export interface BonusTransaction {
  id: string;
  amount: number;
  type: 'EARNED' | 'SPENT' | 'GIFT' | 'EXPIRED' | 'REFUND' | 'REFERRAL' | 'PROMO';
  description: string | null;
  createdAt: string;
}

export interface BonusInfo {
  balance: number;
  totalSpent: number;
  firstOrderAvailable: boolean;
  transactions: BonusTransaction[];
  program: {
    firstOrderDiscount: number;
    earnRate: number;
    maxUsage: number;
  };
}

export interface BonusCalculation {
  orderAmount: number;
  discount: number;
  bonusToUse: number;
  bonusToEarn: number;
  finalAmount: number;
  availableBonuses: number;
  isFirstOrder: boolean;
}

export const bonusApi = {
  // Получить информацию о бонусах
  getBonusInfo: async (): Promise<BonusInfo> => {
    const { data } = await apiClient.get('/bonus');
    return data;
  },

  // Рассчитать бонусы для заказа
  calculateBonuses: async (orderAmount: number, useBonuses: boolean): Promise<BonusCalculation> => {
    const { data } = await apiClient.post('/bonus/calculate', {
      orderAmount,
      useBonuses,
    });
    return data;
  },
};
