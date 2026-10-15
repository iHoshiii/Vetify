import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { env } from '../../../config/env';
import { revokeAllRefreshTokensForUser } from '../../../models/refresh-token';
import { updateUser } from '../../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import {
  app,
  browserSession,
  connectionCode,
  exchange,
  introspect,
  nativeLogout,
  nativeRefresh,
} from './native-auth-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const mainPreferences = (accessToken: string) =>
  request(app).get('/api/v1/account/preferences').set('Authorization', `Bearer ${accessToken}`);

describe('Independent mobile sessions', () => {
  it('rotates native credentials and detects reuse without ending the browser session', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const first = await exchange(code);
    const second = await nativeRefresh(first.body.refreshToken);
    expect(second.status).toBe(200);
    expect(second.body.refreshToken).not.toBe(first.body.refreshToken);
    expect((await introspect(second.body.accessToken)).status).toBe(200);
    expect((await mainPreferences(second.body.accessToken)).status).toBe(200);
    expect((await nativeRefresh(first.body.refreshToken)).status).toBe(401);
    expect((await nativeRefresh(second.body.refreshToken)).status).toBe(401);
    expect((await introspect(second.body.accessToken)).status).toBe(401);
    expect((await mainPreferences(second.body.accessToken)).status).toBe(401);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
  });

  it('revokes access and refresh on native logout and keeps browser cookies intact', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    expect((await mainPreferences(native.body.accessToken)).status).toBe(200);
    const logout = await nativeLogout(native.body.refreshToken);
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie']).toBeUndefined();
    expect((await introspect(native.body.accessToken)).status).toBe(401);
    expect((await mainPreferences(native.body.accessToken)).status).toBe(401);
    expect((await nativeRefresh(native.body.refreshToken)).status).toBe(401);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
  });

  it('keeps an established mobile session after browser logout', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    await browser.post('/api/v1/auth/logout');
    expect((await introspect(native.body.accessToken)).status).toBe(200);
    expect((await nativeRefresh(native.body.refreshToken)).status).toBe(200);
  });

  it('rejects native refresh tokens on the browser refresh endpoint', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${env.REFRESH_COOKIE_NAME}=${native.body.refreshToken}`);
    expect(response.status).toBe(401);
    expect((await introspect(native.body.accessToken)).status).toBe(200);
  });

  it('rejects concurrent refresh reuse and revokes whichever response won', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    const responses = await Promise.all([
      nativeRefresh(native.body.refreshToken),
      nativeRefresh(native.body.refreshToken),
    ]);
    expect(responses.some((response) => response.status === 401)).toBe(true);
    for (const response of responses.filter((entry) => entry.status === 200)) {
      expect((await introspect(response.body.accessToken)).status).toBe(401);
      expect((await nativeRefresh(response.body.refreshToken)).status).toBe(401);
    }
  });

  it('honors account-wide refresh revocation from moderation', async () => {
    const { browser, user } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    await revokeAllRefreshTokensForUser(user._id);
    expect((await introspect(native.body.accessToken)).status).toBe(401);
    expect((await nativeRefresh(native.body.refreshToken)).status).toBe(401);
    expect((await mainPreferences(native.body.accessToken)).status).toBe(401);
  });

  it('rejects blocked accounts on refresh', async () => {
    const { browser, user } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    await updateUser(user._id, { status: 'banned' });
    expect((await nativeRefresh(native.body.refreshToken)).status).toBe(403);
    expect((await introspect(native.body.accessToken)).status).toBe(401);
  });
});
