import { z } from 'zod';

export const AudienceFiltersSchema = z
  .object({
    telegramIds: z.array(z.union([z.string(), z.number()])).optional(),
    includeUserIds: z.array(z.string()).optional(),
    excludeUserIds: z.array(z.string()).optional(),
    hasTelegramUsername: z.boolean().optional(),
    usernameContains: z.string().min(1).optional(),
    hasPhone: z.boolean().optional(),
    isPremium: z.boolean().optional(),
    hasOrders: z.boolean().optional(),
    bonusPointsMin: z.number().int().min(0).optional(),
    bonusPointsMax: z.number().int().min(0).optional(),
    totalSpentMin: z.number().min(0).optional(),
    totalSpentMax: z.number().min(0).optional(),
    ordersCountMin: z.number().int().min(0).optional(),
    ordersCountMax: z.number().int().min(0).optional(),
    daysSinceLastOrderMin: z.number().int().min(0).optional(),
    daysSinceLastOrderMax: z.number().int().min(0).optional(),
    daysSinceLastLoginMin: z.number().int().min(0).optional(),
    daysSinceLastLoginMax: z.number().int().min(0).optional(),
    daysSinceRegistrationMin: z.number().int().min(0).optional(),
    daysSinceRegistrationMax: z.number().int().min(0).optional(),
  })
  .strict();

export type AudienceFilters = z.infer<typeof AudienceFiltersSchema>;

export const AudiencePayloadSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  filters: AudienceFiltersSchema,
});

export type AudiencePayload = z.infer<typeof AudiencePayloadSchema>;
