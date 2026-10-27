import request from 'supertest';
import * as oidc from 'openid-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { usersCollection } from '../../models/users';
import { professionalsCollection } from '../../models/professionals';
import { updateUserPassword } from '../../models/users';
import { env } from '../../config/env';
import { clearTestDb } from '../../test-utils/db';
import { browserSession, startOidc, stopOidc } from './fixtures';
import { blogConfig, config, origin } from './test-server';

beforeAll(startOidc, 120_000);
afterEach(clearTestDb);
afterAll(stopOidc);

async function beginBlog(browser: request.Agent, overrides: Record<string, string> = {}) {
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const url = oidc.buildAuthorizationUrl(blogConfig, {
    redirect_uri: 'http://localhost:5178/auth/callback',
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    ...overrides,
  });
  const initial = await browser.get(url.pathname + url.search);
  if (initial.status !== 303) return { initial, verifier, state, nonce, browser };
  const interaction = new URL(initial.headers.location);
  if (interaction.origin !== origin) return { initial, verifier, state, nonce, browser };
  const result = await browser.get(interaction.pathname + interaction.search);
  return { initial, verifier, state, nonce, browser, result };
}

async function signIntoBlog(browser: request.Agent) {
  const transaction = await beginBlog(browser);
  let callback = new URL(transaction.initial.headers.location);
  if (callback.origin === origin) {
    expect(transaction.result?.status).toBe(303);
    const resume = new URL(transaction.result!.headers.location);
    const completed = await browser.get(resume.pathname + resume.search);
    expect(completed.status).toBe(303);
    callback = new URL(completed.headers.location);
  }
  expect(callback.origin).toBe('http://localhost:5178');
  expect(callback.searchParams.has('access_token')).toBe(false);
  const tokens = await oidc.authorizationCodeGrant(blogConfig, callback, {
    pkceCodeVerifier: transaction.verifier,
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    idTokenExpected: true,
  });
  return { ...transaction, callback, tokens };
}

describe('Blog uses the main Vetify browser session', () => {
  it('signs into Blog automatically without a separate login or consent screen', async () => {
    const { browser, user } = await browserSession('blog@example.com');
    const { result, tokens } = await signIntoBlog(browser);
    expect(result!.headers.location).not.toContain('/auth/shared');
    expect(tokens.claims()).toMatchObject({ sub: user._id.toHexString(), aud: 'vetify-blog' });
    expect(await oidc.tokenIntrospection(blogConfig, tokens.access_token)).toMatchObject({
      active: true,
      aud: 'vetify-blog',
      client_id: 'vetify-blog',
      sub: user._id.toHexString(),
    });
    expect(await oidc.tokenIntrospection(config, tokens.access_token)).toMatchObject({
      active: false,
    });
  });

  it('sends a signed-out visitor to main login without creating a Blog session', async () => {
    const { result } = await beginBlog(request.agent(origin));
    expect(result?.status).toBe(302);
    expect(new URL(result!.headers.location).pathname).toBe('/auth/shared');
  });

  it('rejects an Anatomy callback or resource for the Blog client', async () => {
    const { browser } = await browserSession('blog-separation@example.com');
    const wrongCallback = await beginBlog(browser, {
      redirect_uri: 'http://localhost:5176/auth/callback',
    });
    expect(wrongCallback.initial.status).toBe(400);
    const wrongResource = await beginBlog(browser, { resource: 'http://localhost:5176' });
    expect(wrongResource.initial.headers.location).toContain('error=invalid_target');
  });

  it('revokes Blog access when the originating main session is logged out', async () => {
    const { browser } = await browserSession('blog-logout@example.com');
    const { tokens } = await signIntoBlog(browser);
    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
    expect(await oidc.tokenIntrospection(blogConfig, tokens.access_token)).toMatchObject({
      active: false,
    });
  });
});

const capabilities = (token: string) =>
  request(origin).post('/api/oidc/blog-capabilities').set('Authorization', `Bearer ${token}`);

describe('Blog live capability authority', () => {
  it('binds role and professional approval to the Blog token owner and rechecks changes', async () => {
    const { browser, user } = await browserSession('blog-author@example.com');
    await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'professional' } });
    // Only the lookup fields matter to this contract; no real professional record is used.
    await professionalsCollection().insertOne({ user: user._id, status: 'verified' } as Parameters<
      ReturnType<typeof professionalsCollection>['insertOne']
    >[0]);
    const { tokens } = await signIntoBlog(browser);
    const initial = await capabilities(tokens.access_token);
    expect(initial.status).toBe(200);
    expect(initial.headers['cache-control']).toBe('no-store');
    expect(initial.body.data).toMatchObject({
      version: 1,
      issuer: `${origin}/api/oidc`,
      audience: 'vetify-blog',
      user: { id: user._id.toHexString(), role: 'professional', status: 'active' },
      emailVerified: true,
      professional: { status: 'verified' },
    });
    expect(Date.parse(initial.body.data.validUntil)).toBeLessThanOrEqual(Date.now() + 30000);
    await professionalsCollection().updateOne(
      { user: user._id },
      { $set: { status: 'suspended' } }
    );
    expect((await capabilities(tokens.access_token)).body.data.professional.status).toBe('revoked');
    await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'admin' } });
    expect((await capabilities(tokens.access_token)).body.data.user.role).toBe('admin');
    await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'user' } });
    expect((await capabilities(tokens.access_token)).body.data.user.role).toBe('user');
    await browser.post('/api/v1/auth/logout');
    expect((await capabilities(tokens.access_token)).status).toBe(401);
  });
  it('rejects missing, forged and other-app tokens', async () => {
    expect((await capabilities('forged')).status).toBe(401);
    expect((await request(origin).post('/api/oidc/blog-capabilities')).status).toBe(401);
    const { browser } = await browserSession('blog-isolation@example.com');
    const { signIn } = await import('./fixtures');
    const { tokens } = await signIn(browser);
    expect((await capabilities(tokens.access_token)).status).toBe(401);
  });
  it('revokes only Blog on local logout and honors password changes and global logout', async () => {
    const { browser, user } = await browserSession('blog-revoke@example.com');
    const { signIn } = await import('./fixtures');
    const anatomy = await signIn(browser);
    const first = await signIntoBlog(browser);
    const second = await signIntoBlog(browser);
    await oidc.tokenRevocation(blogConfig, first.tokens.access_token);
    expect((await capabilities(first.tokens.access_token)).status).toBe(401);
    // oidc-provider revokes the Blog grant, including tokens issued from that grant.
    expect((await capabilities(second.tokens.access_token)).status).toBe(401);
    expect((await oidc.tokenIntrospection(config, anatomy.tokens.access_token)).active).toBe(true);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
    const fresh = await signIntoBlog(browser);
    await updateUserPassword(user._id, 'AnotherSup3rSecret!');
    expect((await capabilities(fresh.tokens.access_token)).status).toBe(401);
    const next = await browserSession('blog-global@example.com');
    const third = await signIntoBlog(next.browser);
    await next.browser.post('/api/v1/auth/logout-all').set('Origin', env.CLIENT_ORIGIN);
    expect((await capabilities(third.tokens.access_token)).status).toBe(401);
  });
  it.each(['banned', 'unverified', 'deleted'])(
    'refuses Blog capabilities after an account becomes %s',
    async (change) => {
      const { browser, user } = await browserSession(`blog-${change}@example.com`);
      const { tokens } = await signIntoBlog(browser);
      if (change === 'deleted') await usersCollection().deleteOne({ _id: user._id });
      else
        await usersCollection().updateOne(
          { _id: user._id },
          { $set: change === 'banned' ? { status: 'banned' } : { emailVerified: false } }
        );
      expect((await capabilities(tokens.access_token)).status).toBe(401);
    }
  );
});
