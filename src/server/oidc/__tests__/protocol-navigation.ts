import * as oidc from 'openid-client';
import request from 'supertest';

export async function protocolHandoff(
  origin: string,
  client: oidc.Configuration,
  port = 5175,
  overrides: Record<string, string> = {}
) {
  const browser = request.agent(origin);
  const verifier = oidc.randomPKCECodeVerifier();
  const nonce = oidc.randomNonce();
  const state = oidc.randomState();
  const url = oidc.buildAuthorizationUrl(client, {
    redirect_uri: `http://localhost:${port}/auth/callback`,
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    ...overrides,
  });
  let response = await browser.get(url.pathname + url.search);
  for (let step = 0; step < 5 && response.headers.location; step++) {
    const next = new URL(response.headers.location, origin);
    if (next.origin !== origin) return { response, callback: next, verifier, nonce, state };
    response = await browser.get(next.pathname + next.search);
  }
  return { response, callback: undefined, verifier, nonce, state };
}
