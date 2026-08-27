import { readAccessToken } from '@/lib/auth-storage';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export type ApiErrorBody = {
  error: string;
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

/**
 * Thin fetch wrapper. Sends cookies so the httpOnly auth cookies travel
 * automatically, attaches the access token when there is one so the server can
 * tell a signed-in caller from an anonymous one, and turns a non-2xx response
 * into an ApiError rather than letting callers read fields off an error body.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = readAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload ?? {}) as ApiErrorBody;
    throw new ApiError(
      res.status,
      err.error ?? `Request failed (${res.status})`,
      err.reason,
      err.issues
    );
  }

  return payload as T;
}

/**
 * The same request, for a response that is bytes rather than JSON.
 *
 * A second function rather than a flag on the first, because the two differ in
 * what they do on the way out and not only on the way back: this one sends no
 * Content-Type, asks for no parse, and still has to read a JSON error body when
 * the answer turns out not to be an image after all.
 */
export async function apiFetchBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { body: _body, headers, ...rest } = options;
  const token = readAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const err = ((await res.json().catch(() => null)) ?? {}) as ApiErrorBody;
    throw new ApiError(res.status, err.error ?? `Request failed (${res.status})`, err.reason);
  }

  return await res.blob();
}
