import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  env: { JWT_SECRET_ACCESS: 'introspection-test-secret-at-least-32-characters' },
  isTest: false,
  isProduction: false,
}));

import { env } from '../../config/env';
import { createIntrospectionGuard } from '../introspection-guard';
import { generalLimiter } from '../security';

const FIRST = '0123456789abcdef01234567';
const SECOND = '0123456789abcdef01234568';
const tokenFor = (sub: string, extra = {}) =>
  jwt.sign({ sub, ...extra }, env.JWT_SECRET_ACCESS, { expiresIn: '1h' });
function appWithQuota(limit = 3, invalidLimit = 2) {
  const app = express();
  app.use('/api', generalLimiter);
  app.post('/api/v1/auth/introspect', createIntrospectionGuard(limit, invalidLimit), (req, res) => {
    res.json({ id: req.introspectionClaims?.sub });
  });
  app.get('/api/public', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('Introspection authorization and quotas', () => {
  it('keeps two signed accounts on the same IP in separate account buckets', async () => {
    const app = appWithQuota();
    const first = tokenFor(FIRST);
    const second = tokenFor(SECOND);
    for (let index = 0; index < 3; index++) {
      for (const token of [first, second]) {
        const response = await request(app)
          .post('/api/v1/auth/introspect')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
      }
    }
    const otherTokenForFirst = tokenFor(FIRST, { unique: 'new-token-same-account' });
    expect(
      (
        await request(app)
          .post('/api/v1/auth/introspect')
          .set('Authorization', `Bearer ${otherTokenForFirst}`)
      ).status
    ).toBe(429);
  });

  it('does not spend an account quota on forged or unsigned tokens and limits invalid callers by IP', async () => {
    const app = appWithQuota();
    const forged = jwt.sign({ sub: FIRST }, 'a-different-signing-secret', { expiresIn: '1h' });
    const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: FIRST })
    ).toString('base64url')}.`;
    for (const token of [forged, unsigned]) {
      expect(
        (await request(app).post('/api/v1/auth/introspect').set('Authorization', `Bearer ${token}`))
          .status
      ).toBe(401);
    }
    expect((await request(app).post('/api/v1/auth/introspect')).status).toBe(429);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/introspect')
          .set('Authorization', `Bearer ${tokenFor(FIRST)}`)
      ).status
    ).toBe(200);
  });

  it('allows more than the public IP quota across active accounts while protecting other public routes', async () => {
    const app = appWithQuota();
    for (let index = 0; index < 301; index++) {
      const id = index.toString(16).padStart(24, '0');
      expect(
        (
          await request(app)
            .post('/api/v1/auth/introspect')
            .set('Authorization', `Bearer ${tokenFor(id)}`)
        ).status
      ).toBe(200);
    }
    expect((await request(app).get('/api/public')).status).toBe(200);
    for (let index = 0; index < 300; index++) await request(app).get('/api/public');
    expect((await request(app).get('/api/public')).status).toBe(429);
  });
});
