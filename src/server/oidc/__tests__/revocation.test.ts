import request from 'supertest';
import * as oidc from 'openid-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import { refreshTokensCollection, revokeAllRefreshTokensForUser } from '../../models/refresh-token';
import { updateUserPassword, usersCollection } from '../../models/users';
import { clearTestDb } from '../../test-utils/db';
import { oidcArtifacts } from '../storage';
import {
  authorize,
  begin,
  browserSession,
  config,
  exchange,
  inspect,
  origin,
  signIn,
  startOidc,
  stopOidc,
} from './fixtures';

beforeAll(startOidc, 120_000);
afterEach(clearTestDb);
afterAll(stopOidc);

describe('Anatomy live account and session checks', () => {
  it('continues an existing main session without credentials and refuses it after main logout', async () => {
    const { browser } = await browserSession();
    await signIn(browser);
    const { response } = await begin(browser, { prompt: 'none' });
    const callback = new URL(response.headers.location);
    expect(callback.origin).toBe('http://localhost:5176');
    expect(callback.searchParams.get('code')).toBeTruthy();
    await browser.post('/api/v1/auth/logout');
    const loggedOut = await begin(browser, { prompt: 'none' });
    expect(new URL(loggedOut.response.headers.location).searchParams.get('error')).toBe(
      'login_required'
    );
  });

  it('does not reuse a grant from an older main login when the browser session changes', async () => {
    const { browser } = await browserSession();
    await signIn(browser);
    await browser
      .post('/api/v1/auth/login')
      .send({ email: 'anatomy@example.com', password: 'Sup3rSecret!' });
    const { response } = await begin(browser, { prompt: 'none' });
    expect(new URL(response.headers.location).searchParams.get('error')).toBe('consent_required');
  });

  it('revokes Anatomy locally without ending main or another Anatomy session', async () => {
    const { browser } = await browserSession();
    const first = await signIn(browser);
    const second = await signIn(browser);
    await oidc.tokenRevocation(config, first.tokens.access_token);
    expect(await inspect(first.tokens.access_token)).toEqual({ active: false });
    expect((await inspect(second.tokens.access_token)).active).toBe(true);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
  });

  it('keeps Anatomy active across main refresh-cookie rotation and blocks it after main logout', async () => {
    const { browser } = await browserSession();
    const { tokens } = await signIn(browser);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
    expect((await inspect(tokens.access_token)).active).toBe(true);
    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
    expect(await inspect(tokens.access_token)).toEqual({ active: false });
  });

  it('globally logs out all main browser sessions and their Anatomy grants', async () => {
    const { browser } = await browserSession();
    const other = request.agent(origin);
    await other
      .post('/api/v1/auth/login')
      .send({ email: 'anatomy@example.com', password: 'Sup3rSecret!' });
    const first = await signIn(browser);
    const second = await signIn(other);
    expect(
      (await browser.post('/api/v1/auth/logout-all').set('Origin', env.CLIENT_ORIGIN)).status
    ).toBe(200);
    expect(await inspect(first.tokens.access_token)).toEqual({ active: false });
    expect(await inspect(second.tokens.access_token)).toEqual({ active: false });
    expect((await other.post('/api/v1/auth/refresh')).status).toBe(401);
  });

  it.each(['banned', 'suspended', 'deactivated', 'deleted', 'unverified'])(
    'rejects tokens immediately when an account becomes %s',
    async (change) => {
      const { browser, user } = await browserSession();
      const { tokens } = await signIn(browser);
      if (change === 'deleted') await usersCollection().deleteOne({ _id: user._id });
      else
        await usersCollection().updateOne(
          { _id: user._id },
          {
            $set:
              change === 'unverified' ? { emailVerified: false } : { status: change as 'banned' },
          }
        );
      expect(await inspect(tokens.access_token)).toEqual({ active: false });
    }
  );

  it('rejects a code if its account is disabled before token exchange', async () => {
    const { browser, user } = await browserSession();
    const { code, verifier } = await authorize(browser);
    await usersCollection().updateOne({ _id: user._id }, { $set: { status: 'banned' } });
    expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
  });

  it('honors password changes and session version checks even before token cleanup', async () => {
    const { browser, user } = await browserSession();
    const { tokens } = await signIn(browser);
    await updateUserPassword(user._id, 'AnotherSup3rSecret!');
    expect(await inspect(tokens.access_token)).toEqual({ active: false });
  });

  it('honors refresh-token revocation without a version change', async () => {
    const { browser, user } = await browserSession();
    const { tokens } = await signIn(browser);
    await revokeAllRefreshTokensForUser(user._id);
    expect(await inspect(tokens.access_token)).toEqual({ active: false });
  });

  it('rejects expired browser sessions and expired access tokens before TTL cleanup', async () => {
    const { browser, user } = await browserSession();
    const { tokens } = await signIn(browser);
    await refreshTokensCollection().updateMany(
      { user: user._id },
      { $set: { expiresAt: new Date(0) } }
    );
    expect(await inspect(tokens.access_token)).toEqual({ active: false });
    await oidcArtifacts().updateMany(
      { model: 'AccessToken' },
      { $set: { expiresAt: new Date(0) } }
    );
    expect(await inspect(tokens.access_token)).toEqual({ active: false });
  });
});
