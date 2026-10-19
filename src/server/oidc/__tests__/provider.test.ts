import request from 'supertest';
import * as oidc from 'openid-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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

describe('Anatomy OIDC authorization code provider', () => {
  it('publishes discovery and public signing keys without private material', async () => {
    const metadata = config.serverMetadata();
    expect(metadata.issuer).toBe(`${origin}/api/oidc`);
    expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
    expect(metadata.introspection_endpoint).toBe(`${origin}/api/oidc/token/introspection`);
    expect(metadata.revocation_endpoint).toBe(`${origin}/api/oidc/token/revocation`);
    const jwks = await request(origin).get('/api/oidc/jwks');
    expect(jwks.status).toBe(200);
    expect(jwks.body.keys[0]).toMatchObject({ kty: 'RSA', kid: 'test-rsa' });
    expect(jwks.body.keys[0]).not.toHaveProperty('d');
    expect(jwks.headers['cache-control']).toContain('no-store');
  });

  it('uses main login, PKCE and a verified RS256 ID token with the immutable subject', async () => {
    const { browser, user } = await browserSession();
    const { tokens, callback } = await signIn(browser);
    expect(tokens.claims()?.sub).toBe(user._id.toHexString());
    expect(tokens.claims()?.aud).toBe('vetify-anatomy');
    expect(tokens.refresh_token).toBeUndefined();
    expect(callback.searchParams.has('access_token')).toBe(false);
    const claims = await inspect(tokens.access_token);
    expect(claims).toMatchObject({
      active: true,
      iss: `${origin}/api/oidc`,
      aud: 'vetify-anatomy',
      client_id: 'vetify-anatomy',
      sub: user._id.toHexString(),
      email_verified: true,
      account_active: true,
    });
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects callback tampering, unknown clients and absent or plain PKCE', async () => {
    const { browser } = await browserSession();
    for (const overrides of [
      { redirect_uri: 'https://attacker.example/callback' },
      { client_id: 'unknown-client' },
    ]) {
      const { response } = await begin(browser, overrides);
      expect(response.status).toBe(400);
      expect(response.headers.location).toBeUndefined();
    }
    for (const overrides of [{ code_challenge: '' }, { code_challenge_method: 'plain' }]) {
      const { response } = await begin(browser, overrides);
      expect(response.headers.location).toContain('error=invalid_request');
    }
  });

  it('rejects a wrong verifier, client secret, client ID or callback at exchange', async () => {
    const { browser } = await browserSession();
    const { code, verifier } = await authorize(browser);
    for (const overrides of [
      { client_secret: 'wrong-secret' },
      { client_id: 'unknown-client' },
      { redirect_uri: 'https://attacker.example/callback' },
    ])
      expect((await exchange(code, verifier, overrides)).status).toBeGreaterThanOrEqual(400);
    expect((await exchange(code, oidc.randomPKCECodeVerifier())).body.error).toBe('invalid_grant');
  });

  it('atomically consumes a code when exchanges race and rejects subsequent replay', async () => {
    const { browser } = await browserSession();
    const { code, verifier } = await authorize(browser);
    const responses = await Promise.all([exchange(code, verifier), exchange(code, verifier)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
  });

  it('rejects expired authorization codes before asynchronous Mongo TTL cleanup', async () => {
    const { browser } = await browserSession();
    const { code, verifier } = await authorize(browser);
    await oidcArtifacts().updateMany(
      { model: 'AuthorizationCode' },
      { $set: { expiresAt: new Date(0) } }
    );
    expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
  });

  it('checks state and nonce with the same maintained client used by Anatomy', async () => {
    const { browser } = await browserSession();
    const transaction = await authorize(browser);
    await expect(
      oidc.authorizationCodeGrant(config, transaction.callback, {
        pkceCodeVerifier: transaction.verifier,
        expectedState: 'wrong-state',
        expectedNonce: transaction.nonce,
      })
    ).rejects.toThrow();
    await expect(
      oidc.authorizationCodeGrant(config, transaction.callback, {
        pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state,
        expectedNonce: 'wrong-nonce',
      })
    ).rejects.toThrow();
  });
});
