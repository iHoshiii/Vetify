import { describe, expect, it, vi } from 'vitest';
import { addPassword, cookieOf, methods, session, setupAccountDb } from './account-auth-fixtures';
import {
  emailLinkProof,
  latestLinkCode,
  requestLinkCode,
  verifyLinkCode,
} from './account-link-code-fixtures';
import { accountLinkVerifications } from '../../../models/account-link-verification';
import { REFRESH_GRACE_MS } from '../../../models/refresh-token/rotation';
import {
  ACCOUNT_LINK_PROOF_COOKIE,
  unsealAccountLinkProof,
} from '../../../services/account-link-proof';

setupAccountDb();
describe('email linking timing and resend', () => {
  it('enforces an account-wide sixty-second cooldown including a change of method', async () => {
    const owner = await session('google');
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = Date.now();
    const first = await requestLinkCode(owner, 'local');
    expect(first.status).toBe(200);
    expect(Date.parse(first.body.expiresAt) - now).toBe(300_000);
    expect((await requestLinkCode(owner, 'facebook')).status).toBe(429);
    vi.setSystemTime(now + 59_999);
    expect((await requestLinkCode(owner, 'local')).status).toBe(429);
    vi.setSystemTime(now + 60_000);
    expect((await requestLinkCode(owner, 'local')).status).toBe(200);
  });

  it('expires an unconsumed correct code at exactly five minutes', async () => {
    const owner = await session('google');
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = Date.now();
    await requestLinkCode(owner, 'local');
    const code = latestLinkCode();
    vi.setSystemTime(now + 300_000);
    expect((await verifyLinkCode(owner, 'local', code)).status).toBe(400);
  });

  it('resending replaces the old code and invalidates an already verified grant', async () => {
    const owner = await session('google');
    await requestLinkCode(owner, 'local');
    const old = latestLinkCode();
    await accountLinkVerifications().updateOne(
      { _id: owner.user._id },
      { $set: { resendAvailableAt: new Date(Date.now() - 1) } }
    );
    await requestLinkCode(owner, 'local');
    const next = latestLinkCode();
    expect(next).not.toBe(old);
    expect((await verifyLinkCode(owner, 'local', old)).status).toBe(400);
    expect((await verifyLinkCode(owner, 'local', next)).status).toBe(200);
    await accountLinkVerifications().updateOne(
      { _id: owner.user._id },
      { $set: { resendAvailableAt: new Date(Date.now() - 1) } }
    );
    await requestLinkCode(owner, 'local');
    expect((await addPassword(owner)).status).toBe(403);
  });

  it('rotates a pending code and verified grant with the browser session without extending expiry', async () => {
    const owner = await session('google');
    vi.useFakeTimers({ toFake: ['Date'] });
    await requestLinkCode(owner, 'local');
    const code = latestLinkCode();
    vi.setSystemTime(Date.now() + REFRESH_GRACE_MS + 1);
    expect((await owner.browser.post('/api/v1/auth/refresh')).status).toBe(200);
    const verified = await verifyLinkCode(owner, 'local', code);
    expect(verified.status).toBe(200);
    const cookie = cookieOf(verified, ACCOUNT_LINK_PROOF_COOKIE);
    const original = unsealAccountLinkProof(cookie.slice(ACCOUNT_LINK_PROOF_COOKIE.length + 1))!;
    vi.setSystemTime(Date.now() + REFRESH_GRACE_MS + 1);
    const refresh = await owner.browser.post('/api/v1/auth/refresh');
    const rotated = unsealAccountLinkProof(
      cookieOf(refresh, ACCOUNT_LINK_PROOF_COOKIE).slice(ACCOUNT_LINK_PROOF_COOKIE.length + 1)
    )!;
    expect(rotated.expiresAt).toBe(original.expiresAt);
    expect(rotated.sourceTokenHash).not.toBe(original.sourceTokenHash);
    expect((await methods(owner)).body.passwordReady).toBe(true);
    expect((await addPassword(owner)).status).toBe(200);
  });

  it('does not revive an expired grant when the browser refreshes', async () => {
    const owner = await session('google');
    await emailLinkProof(owner, 'local');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 300_001);
    expect((await methods(owner)).body.passwordReady).toBe(false);
    expect(
      cookieOf(await owner.browser.post('/api/v1/auth/refresh'), ACCOUNT_LINK_PROOF_COOKIE)
    ).toBe('');
    expect((await addPassword(owner)).status).toBe(403);
  });
});
