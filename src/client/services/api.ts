import { readAccessToken, writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { handleEmailVerificationRequired } from '@/lib/email-verification-access';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

// One shared refresh so concurrent 401s trade the cookie for a token once, not N times.
let refreshInFlight: Promise<string | null> | null = null;

// Trade the httpOnly refresh cookie for a new access token. Calls fetch directly, not apiFetch, so a dead cookie cannot recurse.
async function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = ((await res.json().catch(() => null)) ?? {}) as ApiErrorBody;
        if (res.status === 401 || res.status === 403) {
          writeAuthState(null);
          return null;
        }
        throw new ApiError(
          res.status,
          err.error ?? err.message ?? `Request failed (${res.status})`,
          err.reason,
          err.issues
        );
      }
      const session = (await res.json()) as AuthSession;
      writeAuthState(session);
      return session.accessToken;
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export type ApiErrorBody = {
  error?: string;
  /** Some middleware uses the conventional `message` response field. */
  message?: string;
  /** Machine-readable cause, so callers can branch without matching prose. */
  reason?: string;
  issues?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly reason?: string;
  readonly issues?: ApiErrorBody['issues'];

  constructor(status: number, message: string, reason?: string, issues?: ApiErrorBody['issues']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reason = reason;
    this.issues = issues;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const send = (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body !== undefined
          ? { 'Content-Type': body instanceof Blob ? body.type : 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: body instanceof Blob ? body : JSON.stringify(body) } : {}),
    });

  const initialSession = readAuthState();
  let res = await send(initialSession?.accessToken ?? null);

  // A live session whose 15-minute token lapsed: refresh once off the cookie and replay, so the caller never sees a spurious 401.
  const refreshableAuth = ['/auth/subscription', '/auth/email/verify', '/auth/email/resend'];
  if (res.status === 401 && (!path.startsWith('/auth/') || refreshableAuth.includes(path))) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await send(refreshed);
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload ?? {}) as ApiErrorBody;
    if (res.status === 403) handleEmailVerificationRequired(err.reason);
    throw new ApiError(
      res.status,
      err.error ?? err.message ?? `Request failed (${res.status})`,
      err.reason,
      err.issues
    );
  }

  return payload as T;
}

export async function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { body: _body, headers, ...rest } = options;

  const send = (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

  const initialSession = readAuthState();
  let res = await send(initialSession?.accessToken ?? null);

  // Same lapsed-token replay as apiFetch: a blob request is often the first out after a token expires.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken(initialSession?.user?.id ?? null);
    if (refreshed) res = await send(refreshed);
  }

  if (!res.ok) {
    const err = ((await res.json().catch(() => null)) ?? {}) as ApiErrorBody;
    if (res.status === 403) handleEmailVerificationRequired(err.reason);
    throw new ApiError(
      res.status,
      err.error ?? err.message ?? `Request failed (${res.status})`,
      err.reason
    );
  }

  return await res.blob();
}
