import { z } from 'zod';
import { MODERATION_REASON_MAX } from './limits';

export const SUBSCRIPTION_PLANS = ['free', 'pro'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'expired', 'cancelled'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type AccountSubscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null;
  expiresAt: string | null;
};

export const subscriptionUpdateSchema = z
  .object({
    plan: z.enum(SUBSCRIPTION_PLANS),
    status: z.enum(SUBSCRIPTION_STATUSES).nullable(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    reason: z.string().trim().min(1).max(MODERATION_REASON_MAX).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.plan === 'free' && (value.status !== null || value.expiresAt !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plan'],
        message: 'Free accounts have no paid period.',
      });
    }
    if (value.plan === 'pro' && (value.status === null || value.expiresAt === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Pro requires a subscription status and expiry date.',
      });
    }
  });

export type SubscriptionUpdate = z.output<typeof subscriptionUpdateSchema>;
