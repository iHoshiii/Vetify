import request from 'supertest';
import * as oidc from 'openid-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clearTestDb } from '../../test-utils/db';
import { browserSession, startOidc, stopOidc } from './fixtures';
import { booksConfig, config, origin } from './test-server';

beforeAll(startOidc, 120_000);
afterEach(clearTestDb);
afterAll(stopOidc);

async function beginBooks(browser: request.Agent, overrides: Record<string, string> = {}) {
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const url = oidc.buildAuthorizationUrl(booksConfig, {
    redirect_uri: 'http://localhost:5175/auth/callback',
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
  const result = await browser.get(interaction.pathname + interaction.search);
  return { initial, verifier, state, nonce, browser, result };
}

async function signIntoBooks(browser: request.Agent) {
  const transaction = await beginBooks(browser);
  expect(transaction.result?.status).toBe(303);
  const resume = new URL(transaction.result!.headers.location);
  const completed = await browser.get(resume.pathname + resume.search);
  expect(completed.status).toBe(303);
  const callback = new URL(completed.headers.location);
  expect(callback.origin).toBe('http://localhost:5175');
  expect(callback.searchParams.has('access_token')).toBe(false);
  const tokens = await oidc.authorizationCodeGrant(booksConfig, callback, {
    pkceCodeVerifier: transaction.verifier,
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    idTokenExpected: true,
  });
  return { ...transaction, callback, tokens };
}

describe('Books uses the main Vetify browser session', () => {
  it('signs into Books automatically without a separate login or consent screen', async () => {
    const { browser, user } = await browserSession('books@example.com');
    const { result, tokens } = await signIntoBooks(browser);
    expect(result!.headers.location).not.toContain('/auth/shared');
    expect(tokens.claims()).toMatchObject({ sub: user._id.toHexString(), aud: 'vetify-books' });
    expect(await oidc.tokenIntrospection(booksConfig, tokens.access_token)).toMatchObject({
      active: true,
      aud: 'vetify-books',
      client_id: 'vetify-books',
      sub: user._id.toHexString(),
    });
    expect(await oidc.tokenIntrospection(config, tokens.access_token)).toMatchObject({
      active: false,
    });
  });

  it('sends a signed-out visitor to main login without creating a Books session', async () => {
    const { result } = await beginBooks(request.agent(origin));
    expect(result?.status).toBe(302);
    expect(new URL(result!.headers.location).pathname).toBe('/auth/shared');
  });

  it('rejects an Anatomy callback or resource for the Books client', async () => {
    const { browser } = await browserSession('books-separation@example.com');
    const wrongCallback = await beginBooks(browser, {
      redirect_uri: 'http://localhost:5176/auth/callback',
    });
    expect(wrongCallback.initial.status).toBe(400);
    const wrongResource = await beginBooks(browser, { resource: 'http://localhost:5176' });
    expect(wrongResource.initial.headers.location).toContain('error=invalid_target');
  });

  it('revokes Books access when the originating main session is logged out', async () => {
    const { browser } = await browserSession('books-logout@example.com');
    const { tokens } = await signIntoBooks(browser);
    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
    expect(await oidc.tokenIntrospection(booksConfig, tokens.access_token)).toMatchObject({
      active: false,
    });
  });
});
