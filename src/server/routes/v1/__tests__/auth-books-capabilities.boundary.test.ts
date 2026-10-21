import { createHash } from 'node:crypto';
import express from 'express';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env';
import { errorHandler } from '../../../middleware/errorHandler';
import { findProfessionalByUser, type ProfessionalDocument } from '../../../models/professionals';
import { findUserById, type User } from '../../../models/users';
import { currentStatus } from '../../../services/user-status.service';
import router from '../auth-books-capabilities.route';

// Isolate the HTTP contract from Mongo availability; the sibling route suite
// separately exercises the real repositories and account status service.
vi.mock('../../../models/users', () => ({ findUserById: vi.fn() }));
vi.mock('../../../models/professionals', () => ({ findProfessionalByUser: vi.fn() }));
vi.mock('../../../services/user-status.service', () => ({ currentStatus: vi.fn() }));

const app = express().use(express.json()).use('/auth', router).use(errorHandler);
const TOKEN = 'synthetic-worker-credential';
const ID = new ObjectId('0123456789abcdef01234567');
const originalHash = env.BOOKS_CAPABILITY_TOKEN_SHA256;
const originalExpiry = env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT;
function check(
  body: object = { userId: ID.toHexString(), audience: 'vetify-books' },
  token: string | null = TOKEN
) {
  const call = request(app).post('/auth/books-capabilities');
  if (token !== null) call.set('Authorization', `Bearer ${token}`);
  return call.send(body);
}
beforeEach(() => {
  vi.resetAllMocks();
  env.BOOKS_CAPABILITY_TOKEN_SHA256 = createHash('sha256').update(TOKEN).digest('hex');
  env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 90_000).toISOString();
  vi.mocked(findUserById).mockResolvedValue({
    _id: ID,
    role: 'professional',
    emailVerified: true,
  } as User);
  vi.mocked(currentStatus).mockResolvedValue('active');
  vi.mocked(findProfessionalByUser).mockResolvedValue({
    status: 'verified',
  } as ProfessionalDocument);
});
afterEach(() => {
  vi.restoreAllMocks();
  env.BOOKS_CAPABILITY_TOKEN_SHA256 = originalHash;
  env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = originalExpiry;
});

describe('Books capability HTTP boundary', () => {
  it('returns only the requested author capability and binds issuer, audience and validity', async () => {
    const response = await check();
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      version: 2,
      issuer: new URL(env.SERVER_URL).origin,
      audience: 'vetify-books',
      user: { id: ID.toHexString(), role: 'professional', status: 'active' },
      emailVerified: true,
      professional: { status: 'verified' },
      validUntil: expect.any(String),
    });
    expect(findUserById).toHaveBeenCalledWith(ID.toHexString());
    expect(findProfessionalByUser).toHaveBeenCalledWith(ID);
    expect(Date.parse(response.body.validUntil)).toBeGreaterThan(Date.now());
    expect(Date.parse(response.body.validUntil)).toBeLessThanOrEqual(Date.now() + 30_000);
  });

  it.each([null, 'forged', '<placeholder>'])(
    'rejects invalid credentials before database lookups: %s',
    async (token) => {
      expect((await check(undefined, token)).status).toBe(401);
      expect(findUserById).not.toHaveBeenCalled();
    }
  );

  it('fails closed for absent, expired and replaced service credentials', async () => {
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = undefined;
    expect((await check()).status).toBe(503);
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = createHash('sha256').update(TOKEN).digest('hex');
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(0).toISOString();
    expect((await check()).status).toBe(401);
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 90_000).toISOString();
    env.BOOKS_CAPABILITY_TOKEN_SHA256 = createHash('sha256').update('rotated').digest('hex');
    expect((await check()).status).toBe(401);
    expect((await check(undefined, 'rotated')).status).toBe(200);
  });

  it.each([
    { userId: ID.toHexString(), audience: 'another-app' },
    { userId: 'invalid', audience: 'vetify-books' },
    { userId: ID.toHexString(), audience: 'vetify-books', role: 'professional' },
  ])('rejects invalid audience, ID or supplied authority: %j', async (body) => {
    expect((await check(body)).status).toBe(400);
    expect(findUserById).not.toHaveBeenCalled();
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses account status %s',
    async (status) => {
      vi.mocked(currentStatus).mockResolvedValue(status);
      expect((await check()).status).toBe(403);
      expect(findProfessionalByUser).not.toHaveBeenCalled();
    }
  );

  it('refuses deleted or email-unverified authors', async () => {
    vi.mocked(findUserById).mockResolvedValue(null);
    expect((await check()).status).toBe(404);
    vi.mocked(findUserById).mockResolvedValue({ _id: ID, emailVerified: false } as User);
    expect((await check()).status).toBe(403);
  });

  it.each([
    ['verified', 'verified'],
    ['pending', 'pending'],
    ['interview', 'pending'],
    ['rejected', 'rejected'],
    ['suspended', 'revoked'],
  ] as const)('maps approval %s to %s', async (status, expected) => {
    vi.mocked(findProfessionalByUser).mockResolvedValue({ status } as ProfessionalDocument);
    expect((await check()).body.professional.status).toBe(expected);
  });

  it('rereads approval and does not infer verification from a professional role', async () => {
    expect((await check()).body.professional.status).toBe('verified');
    vi.mocked(findProfessionalByUser).mockResolvedValue({
      status: 'suspended',
    } as ProfessionalDocument);
    expect((await check()).body.professional.status).toBe('revoked');
    vi.mocked(findProfessionalByUser).mockResolvedValue(null);
    expect((await check()).body.professional).toBeUndefined();
    expect(findProfessionalByUser).toHaveBeenCalledTimes(3);
  });

  it('caps capability validity at credential expiry, including expiry during the lookup', async () => {
    env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(Date.now() + 10_000).toISOString();
    expect((await check()).body.validUntil).toBe(env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT);
    vi.mocked(findProfessionalByUser).mockImplementationOnce(async () => {
      env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT = new Date(0).toISOString();
      return { status: 'verified' } as ProfessionalDocument;
    });
    expect((await check()).status).toBe(401);
  });

  it('returns no capability on a database outage', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(findUserById).mockRejectedValue(new Error('database unavailable'));
    const response = await check();
    expect(response.status).toBe(500);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.user).toBeUndefined();
  });
});
