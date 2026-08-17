import { apiFetch } from '@/services/api';

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
