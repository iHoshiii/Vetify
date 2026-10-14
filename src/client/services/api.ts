import { readAuthState } from '@/lib/auth-storage';
import { refreshAccessToken } from './auth-refresh';
import { API_BASE_URL } from './api-config';
import { ApiError, type ApiErrorBody } from './api-errors';
export { API_BASE_URL } from './api-config';
export { ApiError, type ApiErrorBody } from './api-errors';

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
  if (res.status === 401 && (!path.startsWith('/auth/') || path === '/auth/subscription')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await send(refreshed);
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload ?? {}) as ApiErrorBody;
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
    throw new ApiError(
      res.status,
      err.error ?? err.message ?? `Request failed (${res.status})`,
      err.reason
    );
  }

  return await res.blob();
}
