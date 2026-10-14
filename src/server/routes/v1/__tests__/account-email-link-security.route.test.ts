import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  addPassword,
  app,
  BASE,
  cookieOf,
  NEW_PASSWORD,
  oauth,
  post,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import {
  emailLinkProof,
  finishEmailLink,
  latestLinkCode,
  requestLinkCode,
  verifyLinkCode,
} from './account-link-code-fixtures';
import { accountLinkVerifications } from '../../../models/account-link-verification';
import { ACCOUNT_LINK_PROOF_COOKIE } from '../../../services/account-link-proof';
import { usersCollection } from '../../../models/users';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { insertAuthIdentity, listAuthIdentities } from '../../../models/auth-identities';

setupAccountDb();
describe('email linking proof security', () => {
  it('binds a code to the account, browser session, and selected method', async () => {
    const owner = await session('google');
    expect((await requestLinkCode(owner, 'local')).status).toBe(200);
    const code = latestLinkCode();
    const other = await session('google', 'other@example.com');
    expect((await verifyLinkCode(other, 'local', code)).status).toBe(400);
    expect((await verifyLinkCode(owner, 'facebook', code)).status).toBe(400);
    expect((await verifyLinkCode(owner, 'local', code)).status).toBe(200);
    expect((await verifyLinkCode(owner, 'local', code)).status).toBe(400);
  });

  it('locks the code after five wrong guesses without adding a password', async () => {
    const owner = await session('google');
    await requestLinkCode(owner, 'local');
    const code = latestLinkCode();
    const wrong = code === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt++)
      expect((await verifyLinkCode(owner, 'local', wrong)).status).toBe(400);
    expect((await verifyLinkCode(owner, 'local', code)).status).toBe(400);
    expect((await addPassword(owner)).status).toBe(403);
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.password).toBeNull();
  });

  it('rejects a stolen or tampered email grant even with an active browser session', async () => {
    const owner = await session('google');
    const verified = await emailLinkProof(owner, 'local');
    const cookie = cookieOf(verified, ACCOUNT_LINK_PROOF_COOKIE);
    const other = await session('google', 'other@example.com');
    for (const [actor, supplied] of [
      [other, cookie],
      [owner, cookie.slice(0, -1) + '!'],
    ] as const) {
      const response = await request(app)
        .post(`${BASE}/password`)
        .set('Authorization', `Bearer ${actor.token}`)
        .set('Cookie', [actor.refreshCookie, supplied])
        .send({ newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
      expect(response.status).toBe(403);
    }
    expect((await addPassword(owner)).status).toBe(200);
  });

  it('requires the browser session to remain active after email verification', async () => {
    const owner = await session('google');
    await emailLinkProof(owner, 'local');
    await refreshTokensCollection().updateOne(
      { tokenHash: hashToken(owner.rawRefresh) },
      { $set: { revokedAt: new Date() } }
    );
    expect((await addPassword(owner)).status).toBe(401);
  });

  it('allows one concurrent code verification and one concurrent Public Login link', async () => {
    const owner = await session('google');
    await requestLinkCode(owner, 'local');
    const code = latestLinkCode();
    const verified = await Promise.all([
      verifyLinkCode(owner, 'local', code),
      verifyLinkCode(owner, 'local', code),
    ]);
    expect(verified.filter((response) => response.status === 200)).toHaveLength(1);
    const cookie = cookieOf(
      verified.find((response) => response.status === 200)!,
      ACCOUNT_LINK_PROOF_COOKIE
    );
    const attempts = await Promise.all(
      [NEW_PASSWORD, 'AnotherSecure93!'].map((password) =>
        request(app)
          .post(`${BASE}/password`)
          .set('Authorization', `Bearer ${owner.token}`)
          .set('Cookie', [owner.refreshCookie, cookie])
          .send({ newPassword: password, confirmPassword: password })
      )
    );
    expect(attempts.filter((response) => response.status === 200)).toHaveLength(1);
    expect(
      (await accountLinkVerifications().findOne({ _id: owner.user._id }))?.consumedAt
    ).toBeInstanceOf(Date);
  });

  it('rejects a social-method grant when used to add Public Login', async () => {
    const owner = await session('google');
    await emailLinkProof(owner, 'facebook');
    expect((await addPassword(owner)).status).toBe(403);
    expect((await post(owner, 'tiktok')).status).toBe(403);
  });

  it('cannot attach a TikTok identity that belongs to another Vetify account', async () => {
    const other = await session('google', 'other@example.com');
    await insertAuthIdentity({
      user: other.user._id,
      provider: 'tiktok',
      providerId: 'taken-tiktok',
    });
    const owner = await session('google');
    const verified = await emailLinkProof(owner, 'tiktok');
    oauth.profile.mockResolvedValue({
      ...PROFILE,
      providerId: 'taken-tiktok',
      email: null,
      emailVerified: false,
    });
    const result = await finishEmailLink(owner, verified);
    expect(redirect(result).searchParams.get('accountAuthError')).toBe('identity-in-use');
    expect(
      (await listAuthIdentities(owner.user._id)).some((identity) => identity.provider === 'tiktok')
    ).toBe(false);
    expect(await usersCollection().countDocuments()).toBe(2);
  });
});
