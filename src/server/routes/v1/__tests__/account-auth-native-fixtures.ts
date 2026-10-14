import crypto from 'node:crypto';
import request from 'supertest';
import { expect } from 'vitest';
import { NATIVE_CLIENT_ID, NATIVE_SOCIAL_REDIRECT_URI } from '../../../../shared/native-auth';
import { app } from './account-auth-fixtures';

export async function nativeGoogleCallback(provider: 'google' | 'facebook' | 'tiktok' = 'google') {
  const verifier = 'a'.repeat(64);
  const client = { clientId: NATIVE_CLIENT_ID, redirectUri: NATIVE_SOCIAL_REDIRECT_URI };
  const started = await request(app)
    .post('/api/v1/auth/native/oauth/start')
    .send({
      ...client,
      provider,
      state: 'b'.repeat(32),
      codeChallenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    });
  expect(started.status).toBe(200);
  const url = new URL(started.body.url as string);
  const browser = request.agent(app);
  const navigation = await browser.get(url.pathname + url.search);
  const state = new URL(navigation.headers.location as string).searchParams.get('state');
  const callback = await browser
    .get(`/api/v1/auth/${provider}/callback`)
    .query({ state, code: 'provider-code' });
  return { url: new URL(callback.headers.location as string), client, verifier };
}

export async function nativeGoogleLogin(provider: 'google' | 'facebook' | 'tiktok' = 'google') {
  const { url, client, verifier } = await nativeGoogleCallback(provider);
  const code = url.searchParams.get('code');
  return request(app)
    .post('/api/v1/auth/native/oauth/exchange')
    .send({ ...client, code, codeVerifier: verifier });
}
