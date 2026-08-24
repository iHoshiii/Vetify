import { z } from 'zod';
import { AUTH_PROVIDERS, USER_ROLES, USER_STATUSES } from './types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// required and optional fields for creating a new user document
//
// `role` and `status` are here so the seed script can mint an admin through the
// same validated path as everyone else. No request handler passes them: signup
// and the OAuth flow both build this object field by field, never by spreading a
// body, so a caller cannot ask to be created as an admin.
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
    role: z.enum(USER_ROLES).default('user'),
    status: z.enum(USER_STATUSES).default('active'),
  })
  .superRefine((attrs, ctx) => {
    // if the provider is 'local' and no password is provided
    if (attrs.provider === 'local' && !attrs.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
    }
  });

export type UserAttrs = z.input<typeof userAttrsSchema>;
