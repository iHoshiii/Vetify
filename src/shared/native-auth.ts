import { z } from 'zod';

export const NATIVE_CLIENT_ID = 'vetify-meal-planner';
export const NATIVE_REDIRECT_URI = 'vetify-planner://auth/callback';
export const NATIVE_HANDOFF_SECONDS = 60;
export const NATIVE_SOCIAL_REDIRECT_URI = 'vetify-planner://auth/social';

export const nativeSocialContextSchema = z
  .object({
    clientId: z.literal(NATIVE_CLIENT_ID),
    redirectUri: z.literal(NATIVE_SOCIAL_REDIRECT_URI),
    state: z.string().regex(/^[a-f0-9]{32}$/),
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type NativeSocialContext = z.infer<typeof nativeSocialContextSchema>;
export const nativeSocialStartSchema = nativeSocialContextSchema.extend({
  provider: z.enum(['google', 'facebook', 'tiktok']),
});
export const nativeSocialExchangeSchema = z
  .object({
    clientId: z.literal(NATIVE_CLIENT_ID),
    redirectUri: z.literal(NATIVE_SOCIAL_REDIRECT_URI),
    code: z.string().regex(/^[a-f0-9]{64}$/),
    codeVerifier: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const nativeHandoffSchema = z.object({
  clientId: z.literal(NATIVE_CLIENT_ID),
  redirectUri: z.literal(NATIVE_REDIRECT_URI),
});
export const nativeExchangeSchema = nativeHandoffSchema.extend({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const nativeRefreshSchema = z.object({
  refreshToken: z.string().regex(/^[a-f0-9]{64}$/),
});
