import {
  addPassword,
  app,
  BASE,
  cookieOf,
  methods,
  NEW_PASSWORD,
  proof,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { REFRESH_GRACE_MS } from '../../../models/refresh-token/rotation';
import { comparePassword, usersCollection } from '../../../models/users';
import { PASSWORD_PROOF_COOKIE, unsealPasswordProof } from '../../../services/account-auth-proof';

setupAccountDb();

describe('password confirmation proof security', () => {
  it('survives browser refresh while keeping its original five-minute expiry', async () => {
    const owner = await session('google');
    const { completed } = await proof(owner);
    const originalCookie = cookieOf(completed, PASSWORD_PROOF_COOKIE);
    const original = unsealPasswordProof(originalCookie.split('=').slice(1).join('='))!;
    expect(original.expiresAt - Date.now()).toBeGreaterThan(290_000);
    expect(String(completed.headers['set-cookie'])).toContain('HttpOnly');
    // Advance beyond the fixture's initial refresh grace to exercise a new rotation.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + REFRESH_GRACE_MS + 1);
    const refreshed = await owner.browser.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    const rotatedCookie = cookieOf(refreshed, PASSWORD_PROOF_COOKIE);
    const rotated = unsealPasswordProof(rotatedCookie.split('=').slice(1).join('='))!;
    expect(rotated.expiresAt).toBe(original.expiresAt);
    expect(rotated.sourceTokenHash).not.toBe(original.sourceTokenHash);
    expect((await methods(owner)).body.passwordReady).toBe(true);
    expect((await addPassword(owner)).status).toBe(200);
  });

  it('expires after five minutes and cannot be revived through refresh', async () => {
    const owner = await session('google');
    await proof(owner);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000);
    expect((await methods(owner)).body.passwordReady).toBe(false);
    expect((await addPassword(owner)).body.reason).toBe('reauth-required');
    const refresh = await owner.browser.post('/api/v1/auth/refresh');
    expect(cookieOf(refresh, PASSWORD_PROOF_COOKIE)).toBe('');
    expect((await addPassword(owner)).body.reason).toBe('reauth-required');
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.password).toBeNull();
  });

  it('rejects stolen proof for another account, a tampered signature, and a revoked session', async () => {
    const owner = await session('google');
    const { completed, flow } = await proof(owner);
    const cookie = cookieOf(completed, PASSWORD_PROOF_COOKIE);
    const other = await session('google', 'other@example.com');
    for (const [actor, proofCookie] of [
      [other, cookie],
      [owner, cookie.slice(0, -1) + '!'],
    ] as const) {
      const response = await request(app)
        .post(`${BASE}/password`)
        .set('Authorization', `Bearer ${actor.token}`)
        .set('Cookie', [actor.refreshCookie, proofCookie, flow.emailCookie])
        .send({ newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
      expect(response.status).toBe(403);
      expect(response.body.reason).toBe('reauth-required');
    }
    await refreshTokensCollection().updateOne(
      { tokenHash: hashToken(owner.rawRefresh) },
      { $set: { revokedAt: new Date() } }
    );
    expect((await addPassword(owner)).status).toBe(401);
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.password).toBeNull();
  });

  it('allows only one concurrent password addition and rejects replay', async () => {
    const owner = await session('google');
    const { completed, flow } = await proof(owner);
    const cookie = cookieOf(completed, PASSWORD_PROOF_COOKIE);
    const attempt = (password: string) =>
      request(app)
        .post(`${BASE}/password`)
        .set('Authorization', `Bearer ${owner.token}`)
        .set('Cookie', [owner.refreshCookie, cookie, flow.emailCookie])
        .send({ newPassword: password, confirmPassword: password });
    const passwords = [NEW_PASSWORD, 'AnotherSecure93!'];
    const responses = await Promise.all(passwords.map(attempt));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    const winner = responses.findIndex((response) => response.status === 200);
    const stored = await usersCollection().findOne({ _id: owner.user._id });
    expect(await comparePassword(stored!.password, passwords[winner])).toBe(true);
    expect(await comparePassword(stored!.password, passwords[1 - winner])).toBe(false);
    expect((await attempt('ReplacementPassword82!')).status).toBe(401);
  });
});
