export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export type ApiErrorBody = {
  error: string;
  issues?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly issues?: ApiErrorBody['issues'];

  constructor(status: number, message: string, issues?: ApiErrorBody['issues']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Thin fetch wrapper. Sends cookies so the httpOnly auth cookies added in
 * Stage 5 travel automatically, and turns a non-2xx response into an ApiError
 * rather than letting callers read fields off an error body.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload ?? {}) as ApiErrorBody;
    throw new ApiError(res.status, err.error ?? `Request failed (${res.status})`, err.issues);
  }

  return payload as T;
}
