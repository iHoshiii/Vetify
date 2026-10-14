import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { requestEmailVerification } from '@/services/email-verification.service';

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
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Verification email sent.' }));
    expect(await requestEmailVerification()).toEqual({ message: 'Verification email sent.' });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/v1/auth/email-verification/request',
      '/api/v1/auth/refresh',
      '/api/v1/auth/email-verification/request',
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
    await expect(requestEmailVerification()).rejects.toMatchObject({
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
          reason: 'verification-cooldown',
        },
        { status: 429 }
      )
    );
    await expect(requestEmailVerification()).rejects.toMatchObject({
      status: 429,
      reason: 'verification-cooldown',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
