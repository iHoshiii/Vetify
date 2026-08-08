import { z } from 'zod';

const allowedChatModels = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
] as const;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().trim().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .trim()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[0-9]/, 'Password must include a number')
      .regex(/[^A-Za-z0-9]/, 'Password must include a special character'),
    confirmPassword: z.string().trim().min(1, 'Please confirm your password'),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1, 'Message cannot be empty.'),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'model']),
          content: z.string().trim().min(1, 'Conversation history entries must include content'),
        })
      )
      .default([]),
    session_id: z.string().trim().default('anonymous'),
    model: z.string().trim().default('gemini-3.5-flash'),
  })
  .transform((value) => ({
    ...value,
    model: allowedChatModels.includes(value.model as (typeof allowedChatModels)[number])
      ? value.model
      : 'gemini-3.5-flash',
  }));

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
