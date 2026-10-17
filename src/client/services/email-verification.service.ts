import { readAuthState } from '@/lib/auth-storage';
import { apiFetch, ApiError } from './api';
import { refreshAccessToken } from './auth-refresh';

export async function requestEmailVerification() {
  const ownerId = readAuthState()?.user?.id;
  const request = () =>
    apiFetch<{ message: string }>('/auth/email-verification/request', { method: 'POST' });
  try {
    return await request();
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.status !== 401 || !ownerId) throw cause;
    if (!(await refreshAccessToken(ownerId))) throw cause;
    return request();
  }
}

export function confirmEmailVerification(input: { token: string }) {
  return apiFetch<{ message: string; verified: true }>('/auth/email-verification/confirm', {
    method: 'POST',
    body: input,
  });
}
