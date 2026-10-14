import { EMAIL_VERIFICATION_REQUIRED } from '@shared/email-verification';
import { readAuthState, writeAuthState } from './auth-storage';

export const VERIFICATION_REQUIRED_EVENT = 'vetify:verification-required';
export function handleEmailVerificationRequired(reason?: string): void {
  if (reason !== EMAIL_VERIFICATION_REQUIRED || typeof window === 'undefined') return;
  const session = readAuthState();
  if (session?.user?.provider !== 'local') return;
  writeAuthState({ ...session, user: { ...session.user, emailVerified: false } });
  window.dispatchEvent(new Event(VERIFICATION_REQUIRED_EVENT));
}
