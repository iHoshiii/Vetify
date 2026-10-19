import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env';
import { getDb } from '../../config/db';
import { usersCollection } from '../../models/users';
import { refreshTokensCollection } from '../../models/refresh-token';
import { clearTestDb } from '../../test-utils/db';
import { MongoOidcAdapter, oidcArtifacts } from '../storage';
import {
  begin,
  browserSession,
  exchange,
  inspect,
  origin,
  signIn,
  startOidc,
  stopOidc,
  authorize,
} from './fixtures';

beforeAll(startOidc, 120_000);
afterEach(clearTestDb);
afterAll(stopOidc);

async function interaction(browser: request.Agent) {
  const { response } = await begin(browser);
  expect(response.status).toBe(303);
  const redirected = await browser.get(new URL(response.headers.location).pathname);
  return new URL(redirected.headers.location).searchParams.get('interaction')!;
}
const complete = (
  browser: request.Agent,
  uid: string,
  originHeader = env.CLIENT_ORIGIN,
  decision = 'allow'
) =>
  browser
    .post(`/api/oidc/interaction/${uid}/complete`)
    .set('Origin', originHeader)
    .type('form')
    .send({ decision });

describe('OIDC interaction and boundary enforcement', () => {
  it('pins discovery URLs to the configured issuer despite untrusted forwarding headers', async () => {
    const response = await request(origin)
      .get('/api/oidc/.well-known/openid-configuration')
      .set('X-Forwarded-Host', 'attacker.example')
      .set('X-Forwarded-Proto', 'https');
    expect(response.body.issuer).toBe(`${origin}/api/oidc`);
    expect(response.body.token_endpoint).toBe(`${origin}/api/oidc/token`);
  });

  it('requires a matching interaction cookie, transaction ID and exact UI Origin', async () => {
    const { browser } = await browserSession();
    const uid = await interaction(browser);
    expect((await complete(browser, uid, 'https://attacker.example')).status).toBe(403);
    expect((await complete(browser, 'wrong-transaction-id')).status).toBe(400);
    expect((await complete(request.agent(origin), uid)).status).toBeGreaterThanOrEqual(400);
    expect(
      (await browser.post('/api/v1/auth/logout-all').set('Origin', 'https://attacker.example'))
        .status
    ).toBe(403);
  });

  it('denies expired interactions, unverified accounts and revoked browser sessions', async () => {
    const { browser, user } = await browserSession();
    const uid = await interaction(browser);
    await usersCollection().updateOne({ _id: user._id }, { $set: { emailVerified: false } });
    expect((await complete(browser, uid)).status).toBe(403);
    await usersCollection().updateOne({ _id: user._id }, { $set: { emailVerified: true } });
    await refreshTokensCollection().updateMany(
      { user: user._id },
      { $set: { revokedAt: new Date() } }
    );
    expect((await complete(browser, uid)).status).toBe(401);
    await oidcArtifacts().updateMany(
      { model: 'Interaction' },
      { $set: { expiresAt: new Date(0) } }
    );
    expect((await complete(browser, uid)).status).toBeGreaterThanOrEqual(400);
  });

  it('cancels sign-in without issuing a code or redirecting to an arbitrary destination', async () => {
    const { browser } = await browserSession();
    const uid = await interaction(browser);
    const completed = await complete(browser, uid, env.CLIENT_ORIGIN, 'deny');
    const resume = new URL(completed.headers.location);
    const response = await browser.get(resume.pathname + resume.search);
    const callback = new URL(response.headers.location);
    expect(callback.origin).toBe('http://localhost:5176');
    expect(callback.searchParams.get('error')).toBe('access_denied');
    expect(callback.searchParams.has('code')).toBe(false);
  });

  it('binds codes and introspection to their own client even when a second client exists', async () => {
    const { browser } = await browserSession();
    const otherSecret = 'independent-other-client-secret-at-least-32-characters';
    await new MongoOidcAdapter('Client').upsert(
      'vetify-other',
      {
        client_id: 'vetify-other',
        client_secret: otherSecret,
        redirect_uris: ['http://localhost:5176/other-callback'],
        response_types: ['code'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'client_secret_post',
      },
      3600
    );
    const { code, verifier } = await authorize(browser);
    expect(
      (await exchange(code, verifier, { client_id: 'vetify-other', client_secret: otherSecret }))
        .body.error
    ).toBe('invalid_grant');
    const { tokens } = await signIn(browser);
    const response = await request(origin)
      .post('/api/oidc/token/introspection')
      .type('form')
      .send({ token: tokens.access_token, client_id: 'vetify-other', client_secret: otherSecret });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ active: false });
    const revocation = await request(origin)
      .post('/api/oidc/token/revocation')
      .type('form')
      .send({ token: tokens.access_token, client_id: 'vetify-other', client_secret: otherSecret });
    expect(revocation.status).toBe(200);
    expect((await inspect(tokens.access_token)).active).toBe(true);
  });

  it('does not return an active identity when persistence is unavailable', async () => {
    const { browser } = await browserSession();
    const { tokens } = await signIn(browser);
    const broken = vi.spyOn(getDb(), 'collection').mockImplementation(() => {
      throw new Error('Synthetic persistence outage');
    });
    try {
      await expect(inspect(tokens.access_token)).rejects.toThrow();
    } finally {
      broken.mockRestore();
    }
  });
});
