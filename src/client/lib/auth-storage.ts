/**
 * Session storage, kept free of imports on purpose.
 *
 * `services/api` needs the access token to set the Authorization header, and
 * `lib/auth` needs `services/api` to make the login calls. Holding the storage
 * primitives here breaks what would otherwise be an import cycle between them.
 */

export type AuthProviderName = 'local' | 'google' | 'facebook' | 'tiktok';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProviderName;
  avatarUrl: string | null;
  emailVerified: boolean;
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
