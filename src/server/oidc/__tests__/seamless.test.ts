import request from 'supertest';
import * as oidc from 'openid-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clearTestDb } from '../../test-utils/db';
import { begin, browserSession, config, inspect, origin, startOidc, stopOidc } from './fixtures';

beforeAll(startOidc, 120_000);
afterEach(clearTestDb);
afterAll(stopOidc);

async function interaction(browser: request.Agent, prompt?: string) {
  const transaction = await begin(browser, { prompt });
  expect(transaction.response.status).toBe(303);
  const url = new URL(transaction.response.headers.location);
  const result =
    url.origin === 'http://localhost:5176'
      ? transaction.response
      : await browser.get(url.pathname + url.search);
  return { ...transaction, result };
}

describe('automatic first-party Anatomy sign-in', () => {
  it('reuses main login without a continuation page and keeps tokens bound to that session', async () => {
    const { browser, user } = await browserSession();
    for (let attempt = 0; attempt < 2; attempt++) {
      const transaction = await interaction(browser);
      expect(transaction.result.status).toBe(303);
      expect(transaction.result.headers.location).not.toContain('/auth/shared');
      const resume = new URL(transaction.result.headers.location);
      const completed =
        resume.origin === 'http://localhost:5176'
          ? transaction.result
          : await browser.get(resume.pathname + resume.search);
      expect(completed.status).toBe(303);
      const callback = new URL(completed.headers.location);
      expect(callback.origin).toBe('http://localhost:5176');
      const tokens = await oidc.authorizationCodeGrant(config, callback, {
        pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
      });
      expect(tokens.claims()?.sub).toBe(user._id.toHexString());
      expect(await inspect(tokens.access_token)).toMatchObject({
        active: true,
        sub: user._id.toHexString(),
      });
      expect(callback.searchParams.has('access_token')).toBe(false);
    }
  });

  it('sends anonymous visitors through main login continuation', async () => {
    const { result } = await interaction(request.agent(origin));
    expect(result.status).toBe(302);
    expect(new URL(result.headers.location).pathname).toBe('/auth/shared');
  });

  it('does not silently complete an explicit consent request', async () => {
    const { browser } = await browserSession();
    const { result } = await interaction(browser, 'consent');
    expect(result.status).toBe(302);
    expect(new URL(result.headers.location).pathname).toBe('/auth/shared');
  });

  it('requires main login again after the main browser session is logged out', async () => {
    const { browser } = await browserSession();
    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
    const { result } = await interaction(browser);
    expect(result.status).toBe(302);
    expect(new URL(result.headers.location).pathname).toBe('/auth/shared');
  });
});
