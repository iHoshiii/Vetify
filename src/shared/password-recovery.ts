import { z } from 'zod';
import { signupSchema } from './schemas';

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
});

function passwordBytes(password: string): number {
  return Array.from(password).reduce((total, character) => {
    const point = character.codePointAt(0)!;
    return total + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0);
}

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/, 'This recovery link is invalid. Please request a new one.'),
    password: signupSchema.shape.password.refine(
      (password) => passwordBytes(password) <= 72,
      'Your password is too long. Please use a shorter password.'
    ),
    confirmPassword: signupSchema.shape.confirmPassword,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
