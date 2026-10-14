import {
  authLogoutMarker,
  readAuthState,
  writeAuthState,
  type AuthSession,
} from '@/lib/auth-storage';
import { API_BASE_URL } from './api-config';
import { ApiError, type ApiErrorBody } from './api-errors';

let refreshInFlight: Promise<AuthSession> | null = null;

export async function withAuthSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? await locks.request('vetify.auth.refresh', operation) : await operation();
}

function assertExpectedOwner(ownerId: string | null) {
  if (ownerId && readAuthState()?.user?.id !== ownerId)
    throw new ApiError(409, 'Your account has changed. Please try again.', 'account-changed');
}

function assertRefreshContext(logoutMarker: string | null, ownerId: string | null) {
  if (authLogoutMarker() !== logoutMarker) {
    if (readAuthState()?.user)
      throw new ApiError(409, 'Your sign-in has changed. Please try again.', 'account-changed');
    throw new ApiError(401, 'Your sign-in has ended. Please sign in again.');
  }
  assertExpectedOwner(ownerId);
}

async function fetchRefreshSession(
  logoutMarker: string | null,
  ownerId: string | null
): Promise<AuthSession> {
  assertRefreshContext(logoutMarker, ownerId);
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const payload = await res.json().catch(() => null);
  assertRefreshContext(logoutMarker, ownerId);
  if (!res.ok) {
    const err = (payload ?? {}) as ApiErrorBody;
    if (res.status === 401 || res.status === 403) writeAuthState(null);
    throw new ApiError(
      res.status,
      err.error ?? err.message ?? `Request failed (${res.status})`,
      err.reason,
      err.issues
    );
  }
  const session = payload as AuthSession;
  if (ownerId && session.user.id !== ownerId)
    throw new ApiError(409, 'Your account has changed. Please sign in again.', 'account-changed');
  writeAuthState(session);
  return session;
}

export function refreshSessionShared(): Promise<AuthSession> {
  if (refreshInFlight) return refreshInFlight;
  const logoutMarker = authLogoutMarker();
  const ownerId = readAuthState()?.user?.id ?? null;
  const refresh = () => fetchRefreshSession(logoutMarker, ownerId);
  refreshInFlight = withAuthSessionLock(refresh).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function refreshSessionFresh(): Promise<AuthSession> {
  const logoutMarker = authLogoutMarker();
  const ownerId = readAuthState()?.user?.id ?? null;
  await refreshInFlight?.catch(() => undefined);
  assertRefreshContext(logoutMarker, ownerId);
  return refreshSessionShared();
}

export async function refreshAccessToken(
  expectedOwnerId: string | null = null
): Promise<string | null> {
  try {
    assertExpectedOwner(expectedOwnerId);
    const session = await refreshSessionShared();
    assertExpectedOwner(expectedOwnerId);
    if (expectedOwnerId && session.user.id !== expectedOwnerId)
      throw new ApiError(409, 'Your account has changed. Please try again.', 'account-changed');
    return session.accessToken;
  } catch (cause) {
    if (cause instanceof ApiError && cause.status !== 401 && cause.status !== 403) throw cause;
    return null;
  }
}
