import { apiFetch } from '@/services/api';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthState = {
  accessToken?: string;
  user?: AuthUser;
};

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
  const payload = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
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
  const payload = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/signup', {
    method: 'POST',
    body: input,
  });
  writeAuthState(payload);
  return payload;
}

export async function logoutFromServer() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    writeAuthState(null);
  }
}
