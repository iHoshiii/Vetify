import { ApiError } from '@/services/api';

export const PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' };
export const LOGIN_METHOD_NAMES = { local: 'Public Login', ...PROVIDER_NAMES };

export const ACCOUNT_AUTH_MESSAGES: Record<string, string> = {
  state: 'That confirmation expired or did not match. Please try again.',
  denied: 'You cancelled the confirmation. Your sign-in methods have not changed.',
  code: 'The provider did not finish confirming your sign-in. Please try again.',
  unconfigured: 'This sign-in provider is currently unavailable. Please try again later.',
  'session-expired': 'Your session expired. Sign in again before changing your sign-in methods.',
  'email-mismatch': 'Use a provider account with the same verified email as your Vetify account.',
  'identity-mismatch': 'Confirm with the same provider account you already use for Vetify.',
  'already-linked': 'This provider is already connected to your Vetify account.',
  'identity-in-use': 'That provider account is connected to another Vetify account.',
  provider: 'The provider could not complete the confirmation. Please try again.',
  'account-changed': 'Your account changed during confirmation. Please try again.',
  'email-link-required': 'Verify your email again before linking this sign-in method.',
};

export function accountAuthError(cause: unknown, fallback: string) {
  if (!(cause instanceof ApiError)) return fallback;
  const messages: Record<string, string> = {
    'password-incorrect': 'Your current password is incorrect. Please try again.',
    'password-required': 'Add a password before connecting another provider.',
    'password-already-exists':
      'This account already has a password. Refresh Security to update it.',
    'provider-unavailable':
      'This sign-in provider is currently unavailable. Please try again later.',
    'reauth-required':
      'Your confirmation expired. Confirm your sign-in again before adding a password.',
    'login-required': 'Your session expired. Sign in again to continue.',
  };
  return (
    (cause.reason && messages[cause.reason]) || (cause.status < 500 ? cause.message : fallback)
  );
}
