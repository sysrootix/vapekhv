import { apiClient } from './client';

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'CANCELLED';

export interface ReferralInvitee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  createdAt: string;
}

export interface ReferralEntry {
  id: string;
  status: ReferralStatus;
  bonusAmount: number;
  createdAt: string;
  notifiedAt?: string | null;
  qualifiedAt?: string | null;
  rewardedAt?: string | null;
  invitee: ReferralInvitee;
}

export interface ReferralStats {
  total: number;
  rewarded: number;
  qualified: number;
  pending: number;
  totalEarned: number;
  potential: number;
}

export interface ReferralOverview {
  code: string;
  link: string;
  bonusPerReferral: number;
  stats: ReferralStats;
  referrals: ReferralEntry[];
}

export const referralApi = {
  getOverview: async (): Promise<ReferralOverview> => {
    const response = await apiClient.get<ReferralOverview>('/referrals');
    return response.data;
  },
};
