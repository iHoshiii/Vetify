/**
 * Session storage, kept free of imports on purpose.
 *
 * `services/api` needs the access token to set the Authorization header, and
 * `lib/auth` needs `services/api` to make the login calls. Holding the storage
 * primitives here breaks what would otherwise be an import cycle between them.
 *
 * The one exception is the shared vocabulary, which imports nothing itself and so
 * cannot be part of a cycle.
 */

import type { AuthProvider, UserRole } from '@shared/schemas';

export type AuthProviderName = AuthProvider;

/**
 * The stored role, taken from the shared vocabulary rather than written out again
 * here. It only decides what the UI offers — the server re-reads the stored role
 * on every protected request, so a tampered localStorage buys a link, not access.
 */
export type { UserRole };

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProviderName;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
};

export type AuthState = {
  accessToken?: string;
  user?: AuthUser;
};

export type AuthSession = { accessToken: string; user: AuthUser };

const AUTH_STORAGE_KEY = 'vetify.auth';

export function readAuthState(): AuthState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeAuthState(state: AuthState | null) {
  if (typeof window === 'undefined') return;
  if (!state?.accessToken || !state.user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function readAccessToken(): string | null {
  return readAuthState()?.accessToken ?? null;
}
