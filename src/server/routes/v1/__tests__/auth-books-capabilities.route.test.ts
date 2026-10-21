import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env';
import { insertProfessional, updateProfessional } from '../../../models/professionals';
import { insertUser, updateUser, usersCollection, type User } from '../../../models/users';
import * as users from '../../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app, browserSession } from './native-auth-fixtures';

const TOKEN = 'synthetic-books-only-service-credential';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const originalHash = env.BOOKS_CAPABILITY_TOKEN_SHA256;
const originalExpiry = env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT;
const check = (userId: string, token: string | null = TOKEN, audience = 'vetify-books') => {
  const call = request(app).post('/api/v1/auth/books-capabilities');
  if (token !== null) call.set('Authorization', `Bearer ${token}`);
  return call.send({ userId, audience });
};
async function author() {
  return insertUser({
    email: 'author@example.com',
    password: 'example-password',
    emailVerified: true,
    role: 'professional',
  });
}
async function approval(
  user: User,
  status: 'verified' | 'pending' | 'interview' | 'rejected' | 'suspended' = 'verified'
) {
  return insertProfessional({
    user: user._id,
    fullName: 'Vet Author',
    licenseNumber: 'BOOKS-123',
    licenseAuthority: 'PRC',
    status,
    addresses: [{ kind: 'clinic', line1: '12 Main St', city: 'Cebu', province: 'Cebu' }],
  });
}

beforeAll(startTestDb, 120_000);
beforeEach(() => {
  env.BOOKS_CAPABILITY_TOKEN_SHA256 = hash(TOKEN);
  env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 90_000).toISOString();
});
afterEach(async () => {
  vi.restoreAllMocks();
  env.BOOKS_CAPABILITY_TOKEN_SHA256 = originalHash;
  env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = originalExpiry;
  await clearTestDb();
});
afterAll(stopTestDb);

describe('Books worker capabilities', () => {
  it('returns the Books contract from current approval without a browser session or private attributes', async () => {
    const user = await author();
    await approval(user);
    const start = Date.now();
    const response = await check(user._id.toHexString());
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      version: 2,
      issuer: new URL(env.SERVER_URL).origin,
      audience: 'vetify-books',
      user: { id: user._id.toHexString(), role: 'professional', status: 'active' },
      emailVerified: true,
      professional: { status: 'verified' },
      validUntil: expect.any(String),
    });
    expect(Date.parse(response.body.validUntil)).toBeGreaterThan(start);
    expect(Date.parse(response.body.validUntil)).toBeLessThanOrEqual(Date.now() + 30_000);
  });

  it('bounds validity by service credential expiry', async () => {
    const user = await author();
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 10_000).toISOString();
    const response = await check(user._id.toHexString());
    expect(response.status).toBe(200);
    expect(response.body.validUntil).toBe(env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT);
  });

  it.each([null, 'forged', '<books_only_capability_service_credential_from_main>'])(
    'rejects missing/invalid credential %s before account reads',
    async (token) => {
      const lookup = vi.spyOn(users, 'findUserById');
      const response = await check(new ObjectId().toHexString(), token);
      expect(response.status).toBe(401);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(lookup).not.toHaveBeenCalled();
    }
  );

  it('rejects user tokens here and the service token at user-authenticated endpoints', async () => {
    const { user, accessToken } = await browserSession();
    expect((await check(user._id.toHexString(), accessToken)).status).toBe(401);
    expect(
      (await request(app).post('/api/v1/auth/introspect').set('Authorization', `Bearer ${TOKEN}`))
        .status
    ).toBe(401);
    expect(
      (await request(app).get('/api/v1/account').set('Authorization', `Bearer ${TOKEN}`)).status
    ).toBe(401);
  });

  it('fails closed when unconfigured, expired or rotated', async () => {
    const userId = new ObjectId().toHexString();
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = undefined;
    expect((await check(userId)).status).toBe(503);
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = hash(TOKEN);
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(0).toISOString();
    expect((await check(userId)).status).toBe(401);
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 90_000).toISOString();
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = hash('replacement-credential');
    expect((await check(userId)).status).toBe(401);
    expect((await check(userId, 'replacement-credential')).status).toBe(404);
  });

  it('rejects another audience, malformed ID and caller-supplied authority', async () => {
    const user = await author();
    expect((await check(user._id.toHexString(), TOKEN, 'vetify-anatomy')).status).toBe(400);
    expect((await check('invalid')).status).toBe(400);
    const response = await request(app)
      .post('/api/v1/auth/books-capabilities')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        userId: user._id.toHexString(),
        audience: 'vetify-books',
        professional: { status: 'verified' },
      });
    expect(response.status).toBe(400);
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses a currently %s author',
    async (status) => {
      const user = await author();
      await approval(user);
      await updateUser(user._id, { status });
      expect((await check(user._id.toHexString())).status).toBe(403);
    }
  );

  it('refuses unverified or deleted accounts', async () => {
    const user = await author();
    await updateUser(user._id, { emailVerified: false });
    expect((await check(user._id.toHexString())).status).toBe(403);
    await usersCollection().deleteOne({ _id: user._id });
    expect((await check(user._id.toHexString())).status).toBe(404);
  });

  it('does not infer professional approval from role', async () => {
    const user = await author();
    const response = await check(user._id.toHexString());
    expect(response.status).toBe(200);
    expect(response.body.professional).toBeUndefined();
  });

  it.each([
    ['pending', 'pending'],
    ['interview', 'pending'],
    ['rejected', 'rejected'],
    ['suspended', 'revoked'],
  ] as const)('maps main approval %s to Books %s', async (status, expected) => {
    const user = await author();
    await approval(user, status);
    expect((await check(user._id.toHexString())).body.professional.status).toBe(expected);
  });

  it('observes approval revocation and role demotion on the very next request', async () => {
    const user = await author();
    const application = await approval(user);
    expect((await check(user._id.toHexString())).body.professional.status).toBe('verified');
    await updateProfessional(application._id, { status: 'suspended' });
    expect((await check(user._id.toHexString())).body.professional.status).toBe('revoked');
    await updateUser(user._id, { role: 'user' });
    expect((await check(user._id.toHexString())).body.user.role).toBe('user');
  });
});
