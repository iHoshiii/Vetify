import type { EmailVerificationDelivery } from '@shared/email-verification';
import { writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { apiFetch } from './api';
import { withAuthSessionLock } from './auth-refresh';

export type SignupSession = AuthSession & { emailVerification?: EmailVerificationDelivery };
export function signupWithEmail(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<SignupSession> {
  return withAuthSessionLock(async () => {
    const session = await apiFetch<SignupSession>('/auth/signup', { method: 'POST', body: input });
    writeAuthState(session, false);
    return session;
  });
}
