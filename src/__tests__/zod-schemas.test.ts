import { describe, expect, it } from 'vitest';

import { chatRequestSchema, loginSchema, signupSchema } from '@/lib/schemas';

describe('Zod schemas', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({
      email: 'owner@example.com',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid signup payload with helpful issues', () => {
    const result = signupSchema.safeParse({
      name: 'A',
      email: 'not-an-email',
      password: '123',
      confirmPassword: '456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain(
        'Name must be at least 2 characters'
      );
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Please enter a valid email address'
      );
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwords do not match'
      );
    }
  });

  it('validates chat requests and normalizes the model', () => {
    const result = chatRequestSchema.safeParse({
      message: 'My dog is coughing',
      history: [{ role: 'user', content: 'Hi there' }],
      model: 'bad-model',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe('gemini-3.5-flash');
    }
  });
});
