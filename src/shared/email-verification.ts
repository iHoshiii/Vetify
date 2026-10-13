import { z } from 'zod';

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
