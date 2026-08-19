import { z } from 'zod';
import { AUTH_PROVIDERS } from './types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// required and optional fields for creating a new user document
export const userAttrsSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z.string().min(1).nullish(),
    name: z.string().trim().min(1).nullish(),
    provider: z.enum(AUTH_PROVIDERS).default('local'),
    providerId: z.string().min(1).nullish(),
    avatarUrl: z.string().min(1).nullish(),
    emailVerified: z.boolean().default(false),
  })
  .superRefine((attrs, ctx) => {
    // if the provider is 'local' and no password is provided
    if (attrs.provider === 'local' && !attrs.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
    }
  });

export type UserAttrs = z.input<typeof userAttrsSchema>;
