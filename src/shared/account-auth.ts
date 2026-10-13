import { z } from 'zod';

import { passwordChangeSchema } from './schemas';

export const ACCOUNT_AUTH_PROVIDERS = ['google', 'facebook', 'tiktok'] as const;
export type AccountAuthProvider = (typeof ACCOUNT_AUTH_PROVIDERS)[number];
export const ACCOUNT_LINK_METHODS = ['local', ...ACCOUNT_AUTH_PROVIDERS] as const;
export type AccountLinkMethod = (typeof ACCOUNT_LINK_METHODS)[number];
export const requestAccountLinkSchema = z.object({ method: z.enum(ACCOUNT_LINK_METHODS) });
export const verifyAccountLinkSchema = requestAccountLinkSchema.extend({
  code: z.string().regex(/^[0-9]{6}$/, 'Enter the six-digit code sent to your email'),
});
export type AccountLoginMethods = {
  hasPassword: boolean;
  providers: AccountAuthProvider[];
  googleAvailable: boolean;
  availableProviders: AccountAuthProvider[];
  tiktokHttpsReady?: boolean;
  passwordReady: boolean;
  reauthProvider: AccountAuthProvider | null;
};

export const ACCOUNT_AUTH_ERRORS = [
  'state',
  'denied',
  'code',
  'unconfigured',
  'session-expired',
  'email-mismatch',
  'identity-mismatch',
  'already-linked',
  'identity-in-use',
  'provider',
  'account-changed',
  'email-link-required',
] as const;
export type AccountAuthError = (typeof ACCOUNT_AUTH_ERRORS)[number];

export const accountAuthContextSchema = z
  .object({
    purpose: z.enum(['connect-provider', 'add-password']),
    userId: z
      .string()
      .length(24)
      .regex(/^[a-f0-9]{24}$/),
    sourceTokenHash: z
      .string()
      .length(64)
      .regex(/^[a-f0-9]{64}$/),
    emailLinkGeneration: z
      .string()
      .length(64)
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export type AccountAuthContext = z.infer<typeof accountAuthContextSchema>;

export const connectProviderSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').optional(),
});
export type ConnectProviderInput = z.infer<typeof connectProviderSchema>;

export const addPasswordSchema = z
  .object({
    newPassword: passwordChangeSchema.shape.newPassword,
    confirmPassword: z.string().trim().min(1, 'Confirm your password'),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type AddPasswordInput = z.infer<typeof addPasswordSchema>;
