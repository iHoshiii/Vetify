import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { resendEmailVerification } from '@/lib/auth';

const session: AuthSession = {
  accessToken: 'expired-token',
  user: {
    id: 'owner',
    email: 'owner@example.test',
    name: 'Owner',
    provider: 'local',
    avatarUrl: null,
    emailVerified: false,
    role: 'user',
  },
};
const fetchMock = vi.fn();
const delivery = {
  sent: true,
  expiresAt: '2030-01-01T00:05:00.000Z',
  resendAvailableAt: '2030-01-01T00:01:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  writeAuthState(session, false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('verification resend session recovery', () => {
  it('refreshes an expired access token once and retries for the same account', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Invalid token.' }, { status: 401 }));
    fetchMock.mockResolvedValueOnce(Response.json({ ...session, accessToken: 'renewed-token' }));
    fetchMock.mockResolvedValueOnce(Response.json(delivery));
    expect(await resendEmailVerification()).toEqual(delivery);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/v1/auth/email/resend',
      '/api/v1/auth/refresh',
      '/api/v1/auth/email/resend',
    ]);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer renewed-token' },
    });
  });

  it('does not send a verification email to a different account after sign-in changes', async () => {
    fetchMock.mockImplementationOnce(async () => {
      writeAuthState({ ...session, user: { ...session.user, id: 'other-owner' } }, false);
      return Response.json({ error: 'Invalid token.' }, { status: 401 });
    });
    await expect(resendEmailVerification()).rejects.toMatchObject({
      status: 409,
      reason: 'account-changed',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('shows cooldown errors without refreshing or automatically resending', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          error: 'Please wait one minute before requesting another verification email.',
          reason: 'email-verification-cooldown',
        },
        { status: 429 }
      )
    );
    await expect(resendEmailVerification()).rejects.toMatchObject({
      status: 429,
      reason: 'email-verification-cooldown',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
