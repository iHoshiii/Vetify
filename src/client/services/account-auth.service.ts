import type { AccountLinkMethod, AccountLoginMethods } from '@shared/account-auth';
import type { EmailVerificationDelivery } from '@shared/email-verification';
import { apiFetch } from './api';

export function getAccountLoginMethods(signal?: AbortSignal) {
  return apiFetch<AccountLoginMethods>('/account/login-methods', { signal });
}

export function requestAccountLinkCode(method: AccountLinkMethod) {
  return apiFetch<EmailVerificationDelivery>('/account/login-methods/link/code', {
    method: 'POST',
    body: { method },
  });
}
export function verifyAccountLinkCode(method: AccountLinkMethod, code: string) {
  return apiFetch<{ verified: true; url?: string }>('/account/login-methods/link/verify', {
    method: 'POST',
    body: { method, code },
  });
}

export function reauthenticateAccount() {
  return apiFetch<{ url: string }>('/account/login-methods/reauthenticate', {
    method: 'POST',
    body: {},
  });
}

export function addAccountPassword(body: { newPassword: string; confirmPassword: string }) {
  return apiFetch<{ added: true }>('/account/login-methods/password', { method: 'POST', body });
}

export function openAccountAuthUrl(url: string) {
  const destination = new URL(url, window.location.origin);
  if (destination.protocol !== 'https:' && destination.origin !== window.location.origin) {
    throw new Error('That sign-in link could not be opened. Please try again.');
  }
  window.location.assign(destination.href);
}
