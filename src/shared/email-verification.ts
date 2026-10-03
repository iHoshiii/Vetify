import { z } from 'zod';

export const emailVerificationConfirmSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'This verification link is invalid. Please request a new one.'),
});

export type EmailVerificationConfirm = z.infer<typeof emailVerificationConfirmSchema>;
