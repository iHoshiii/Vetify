import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { insertUser, usersCollection } from '../../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
const credentials = { email: 'refresh@example.com', password: 'Sup3rSecret!' };
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

function cookie(response: request.Response): string {
  return (response.headers['set-cookie'] as unknown as string[])
    .find((value) => value.startsWith(`${env.REFRESH_COOKIE_NAME}=`))!
    .split(';')[0];
}

async function login() {
  return request(app).post('/api/v1/auth/login').send(credentials);
}
function refresh(value: string) {
  return request(app).post('/api/v1/auth/refresh').set('Cookie', value);
}

describe('refresh across tabs', () => {
  it('gives overlapping requests one successor without revoking the session', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    const original = cookie(await login());
    const responses = await Promise.all(Array.from({ length: 8 }, () => refresh(original)));
    expect(responses.map((response) => response.status)).toEqual(Array(8).fill(200));
    expect(new Set(responses.map(cookie)).size).toBe(1);
    const successor = cookie(responses[0]);
    expect(successor).not.toBe(original);
    expect(cookie(await refresh(successor))).toBe(successor);
    expect((await refresh(original)).status).toBe(200);
    const stored = await refreshTokensCollection().findOne({});
    expect(stored?.tokenHash).toBe(hashToken(successor.split('=')[1]));
    expect(stored?.revokedAt).toBeNull();
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
  });

  it('rejects expired predecessor reuse and preserves another device session', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    const original = cookie(await login());
    const successor = cookie(await refresh(original));
    const otherDevice = cookie(await login());
    await refreshTokensCollection().updateOne(
      { tokenHash: hashToken(successor.split('=')[1]) },
      { $set: { previousValidUntil: new Date(Date.now() - 1) } }
    );
    expect((await refresh(original)).status).toBe(401);
    expect((await refresh(successor)).status).toBe(401);
    expect((await refresh(otherDevice)).status).toBe(200);
  });

  it('logout using an overlapping predecessor revokes the whole session', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    const original = cookie(await login());
    const successor = cookie(await refresh(original));
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', original)).status).toBe(
      200
    );
    expect((await refresh(original)).status).toBe(401);
    expect((await refresh(successor)).status).toBe(401);
  });

  it('does not let a stale session renew after the password version changes', async () => {
    const user = await insertUser({ ...credentials, provider: 'local' });
    const original = cookie(await login());
    await usersCollection().updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    expect((await refresh(original)).status).toBe(401);
  });

  it('rotates again after grace without extending the absolute session expiry', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    const original = cookie(await login());
    const successor = cookie(await refresh(original));
    const stored = (await refreshTokensCollection().findOne({}))!;
    await refreshTokensCollection().updateOne(
      { _id: stored._id },
      { $set: { previousValidUntil: new Date(Date.now() - 1) } }
    );
    const next = await refresh(successor);
    expect(next.status).toBe(200);
    expect(cookie(next)).not.toBe(successor);
    expect((await refreshTokensCollection().findOne({}))?.expiresAt).toEqual(stored.expiresAt);
    expect((await refresh(original)).status).toBe(401);
  });
});
