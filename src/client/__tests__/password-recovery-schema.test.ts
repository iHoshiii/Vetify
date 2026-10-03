import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from '@shared/password-recovery';

describe('recovery password length', () => {
  it('rejects passwords over the hashing limit even when Unicode uses fewer characters', () => {
    const password = `A1!${'界'.repeat(24)}`;
    expect(password.length).toBeLessThan(72);
    expect(
      resetPasswordSchema.safeParse({ token: 'a'.repeat(64), password, confirmPassword: password })
        .success
    ).toBe(false);
  });

  it('accepts a valid password at the byte limit', () => {
    const password = `A1!${'界'.repeat(23)}`;
    expect(
      resetPasswordSchema.safeParse({ token: 'a'.repeat(64), password, confirmPassword: password })
        .success
    ).toBe(true);
  });
});
