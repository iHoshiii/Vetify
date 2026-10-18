import request from 'supertest';
import * as oidc from 'openid-client';
import { expect } from 'vitest';
import { env } from '../../config/env';
import { insertUser } from '../../models/users';
import { ANATOMY_CLIENT_ID } from '../settings';
import { origin, config, secret } from './test-server';
export { origin, config, startOidc, stopOidc } from './test-server';

export async function browserSession(
  email = 'anatomy@example.com',
  provider: 'local' | 'google' = 'local'
) {
  const user = await insertUser({
    email,
    password: 'Sup3rSecret!',
    name: 'Anatomy Owner',
    emailVerified: true,
    provider,
  });
  const browser = request.agent(origin);
  if (provider === 'local') {
    const login = await browser
      .post('/api/v1/auth/login')
      .send({ email, password: 'Sup3rSecret!' });
    expect(login.status).toBe(200);
  }
  return { browser, user };
}

export async function begin(
  browser: request.Agent,
  overrides: Record<string, string | undefined> = {}
) {
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: 'http://localhost:5176/auth/callback',
    scope: 'openid email',
    response_type: 'code',
    prompt: 'login',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    ...Object.fromEntries(
      Object.entries(overrides).filter((entry): entry is [string, string] => entry[1] !== undefined)
    ),
  });
  const response = await browser.get(url.pathname + url.search);
  return { verifier, state, nonce, url, response };
}

export async function authorize(
  browser: request.Agent,
  overrides: Record<string, string | undefined> = {}
) {
  const transaction = await begin(browser, overrides);
  expect(transaction.response.status).toBe(303);
  const interactionUrl = new URL(transaction.response.headers.location);
  const interaction = await browser.get(interactionUrl.pathname);
  expect(interaction.status).toBe(302);
  const uid = new URL(interaction.headers.location).searchParams.get('interaction')!;
  const completed = await browser
    .post(`/api/oidc/interaction/${uid}/complete`)
    .set('Origin', env.CLIENT_ORIGIN)
    .type('form')
    .send({ decision: 'allow' });
  expect(completed.status, JSON.stringify(completed.body)).toBe(303);
  const resume = new URL(completed.headers.location);
  const response = await browser.get(resume.pathname + resume.search);
  expect(response.status, JSON.stringify(response.body)).toBe(303);
  const callback = new URL(response.headers.location);
  expect(callback.searchParams.get('error'), callback.href).toBeNull();
  expect(callback.origin).toBe('http://localhost:5176');
  return { ...transaction, callback, code: callback.searchParams.get('code')! };
}

export async function signIn(browser: request.Agent) {
  const transaction = await authorize(browser);
  const tokens = await oidc.authorizationCodeGrant(config, transaction.callback, {
    pkceCodeVerifier: transaction.verifier,
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    idTokenExpected: true,
  });
  return { ...transaction, tokens };
}

export const inspect = (token: string) => oidc.tokenIntrospection(config, token);
export const exchange = (
  code: string,
  verifier: string,
  overrides: Record<string, string | undefined> = {}
) =>
  request(origin)
    .post('/api/oidc/token')
    .type('form')
    .send({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: ANATOMY_CLIENT_ID,
      client_secret: secret,
      redirect_uri: 'http://localhost:5176/auth/callback',
      ...overrides,
    });
