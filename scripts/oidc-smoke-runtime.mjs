import assert from 'node:assert/strict';
import { createHash, createPublicKey, generateKeyPairSync, randomBytes, verify } from 'node:crypto';
import { oidcLambdaRequester } from './oidc-lambda-request.mjs';

export function configureOidcSmoke() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.SERVER_URL = 'https://vetify.page';
  process.env.OIDC_ISSUER = 'https://vetify.page/api/oidc';
  process.env.OIDC_ANATOMY_CLIENT_SECRET =
    'synthetic-isolated-anatomy-client-secret-at-least-32-characters';
  process.env.OIDC_COOKIE_KEYS = JSON.stringify([
    'synthetic-isolated-oidc-cookie-key-at-least-32-characters',
  ]);
  process.env.OIDC_JWKS = JSON.stringify({
    keys: [{ ...privateKey.export({ format: 'jwk' }), kid: 'smoke-rsa', alg: 'RS256', use: 'sig' }],
  });
}

export async function verifyOidcLambda(handler, cookies, userId) {
  const request = oidcLambdaRequester(handler, cookies);
  const discovery = await request('/api/oidc/.well-known/openid-configuration');
  assert.equal(discovery.statusCode, 200);
  const metadata = JSON.parse(discovery.body);
  assert.equal(metadata.issuer, process.env.OIDC_ISSUER);
  assert.equal(metadata.token_endpoint, `${process.env.OIDC_ISSUER}/token`);
  assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const authorization = new URL(metadata.authorization_endpoint);
  authorization.search = new URLSearchParams({
    response_type: 'code',
    client_id: 'vetify-anatomy',
    redirect_uri: 'https://anatomy.vetify.page/auth/callback',
    scope: 'openid email',
    state,
    nonce,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  const started = await request(authorization.href);
  assert.equal(started.statusCode, 303);
  assert.ok(started.cookies?.some((cookie) => cookie.startsWith('vetify_oidc_interaction=')));
  const interaction = await request(started.headers.location);
  assert.equal(interaction.statusCode, 303, interaction.body);
  assert.notEqual(new URL(interaction.headers.location).pathname, '/auth/shared');
  const resumed = await request(interaction.headers.location);
  assert.equal(resumed.statusCode, 303, resumed.body);
  const callback = new URL(resumed.headers.location);
  assert.equal(callback.origin, 'https://anatomy.vetify.page');
  assert.equal(callback.searchParams.get('state'), state);
  assert.equal(callback.searchParams.get('iss'), metadata.issuer);
  assert.ok(callback.searchParams.get('code'), callback.href);
  const client = {
    client_id: 'vetify-anatomy',
    client_secret: process.env.OIDC_ANATOMY_CLIENT_SECRET,
  };
  const exchanged = await request(metadata.token_endpoint, {
    ...client,
    grant_type: 'authorization_code',
    code: callback.searchParams.get('code'),
    code_verifier: verifier,
    redirect_uri: 'https://anatomy.vetify.page/auth/callback',
  });
  assert.equal(exchanged.statusCode, 200, exchanged.body);
  const tokens = JSON.parse(exchanged.body);
  const [header, payload, signature] = tokens.id_token.split('.');
  const jwks = JSON.parse((await request(metadata.jwks_uri)).body);
  assert.equal(jwks.keys[0].d, undefined);
  const key = createPublicKey({ key: jwks.keys[0], format: 'jwk' });
  assert.equal(
    verify(
      'RSA-SHA256',
      Buffer.from(`${header}.${payload}`),
      key,
      Buffer.from(signature, 'base64url')
    ),
    true
  );
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.sub, userId);
  assert.equal(claims.iss, metadata.issuer);
  assert.equal(claims.aud, 'vetify-anatomy');
  assert.equal(claims.nonce, nonce);
  const inspection = await request(metadata.introspection_endpoint, {
    ...client,
    token: tokens.access_token,
  });
  assert.equal(inspection.statusCode, 200);
  const identity = JSON.parse(inspection.body);
  assert.equal(identity.active, true);
  assert.equal(identity.sub, userId);
  assert.equal(identity.aud, 'vetify-anatomy');
  assert.equal(identity.account_active, true);
  assert.equal(identity.email_verified, true);
  assert.equal(inspection.headers['cache-control'], 'no-store');
  assert.equal(
    (await request(metadata.revocation_endpoint, { ...client, token: tokens.access_token }))
      .statusCode,
    200
  );
  const revoked = await request(metadata.introspection_endpoint, {
    ...client,
    token: tokens.access_token,
  });
  assert.deepEqual(JSON.parse(revoked.body), { active: false });
  console.log(
    '[lambda smoke] Automatic OIDC sign-in, discovery, cookies, PKCE, signed identity, introspection and revocation passed'
  );
}
