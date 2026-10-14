import { z } from 'zod';

export const EMAIL_VERIFICATION_REQUIRED = 'email-verification-required';
export function needsEmailVerification(
  user: { provider: string; emailVerified?: boolean } | null | undefined
): boolean {
  return user?.provider === 'local' && user.emailVerified !== true;
}

export type EmailVerificationDelivery = {
  sent: boolean;
  expiresAt: string;
  resendAvailableAt: string;
};

export const emailVerificationSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^[0-9]{6}$/, 'Enter the six-digit code from your email.'),
});

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
