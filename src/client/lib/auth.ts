import { apiFetch } from '@/services/api';

import {
  writeAuthState,
  type AuthProviderName,
  type AuthSession,
  type AuthUser,
} from './auth-storage';

// Storage lives in ./auth-storage so services/api can read the token without a
// cycle. Re-exported here because everything already imports from '@/lib/auth'.
export {
  readAccessToken,
  readAuthState,
  writeAuthState,
  type AuthProviderName,
  type AuthSession,
  type AuthState,
  type AuthUser,
} from './auth-storage';

export async function loginWithEmail(email: string, password: string) {
  const payload = await apiFetch<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  writeAuthState(payload);
  return payload;
}

export async function signupWithEmail(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const payload = await apiFetch<AuthSession>('/auth/signup', {
    method: 'POST',
    body: input,
  });
  writeAuthState(payload);
  return payload;
}

/**
 * Trades the httpOnly refresh cookie for an access token plus the current user.
 * Two callers: the OAuth callback page, where this is the only way to discover
 * who just logged in, and app startup, to revive a session whose 15-minute
 * access token has expired while the 30-day cookie is still good.
 */
export async function refreshSession(): Promise<AuthSession> {
  const payload = await apiFetch<AuthSession>('/auth/refresh', { method: 'POST' });
  writeAuthState(payload);
  return payload;
}

/** Server-side redirect start. A full navigation, not fetch — OAuth needs the
 * browser to leave the SPA so the provider can own the address bar. */
export function startSocialLogin(provider: Exclude<AuthProviderName, 'local'>): void {
  window.location.href = `/api/v1/auth/${provider}`;
}

export async function logoutFromServer() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    writeAuthState(null);
  }
}

/**
 * Where a fresh session lands.
 *
 * `from` wins whenever a gate turned somebody away from a page they asked for.
 * Failing that, an admin goes to the console and everybody else to the site: the
 * console is its own shell now, and dropping an admin on the marketing homepage
 * leaves them one more click from the only surface they signed in for.
 *
 * Not a permission. `RequireRole` and the server's re-read of the stored role
 * decide what an admin may actually do; this only decides where they arrive.
 */
export function landingFor(user: AuthUser, from?: string | null): string {
  if (from) return from;
  return user.role === 'admin' ? '/admin' : '/';
}
