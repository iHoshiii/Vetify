import { app, setupAccountDb, PASSWORD as CREDENTIAL_PASSWORD } from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { insertUser, findUserById } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';

setupAccountDb();

describe('deactivation for social accounts with passwords', () => {
  it.each([undefined, 'wrong-password'])(
    'requires the stored password on a Google-origin account (%s)',
    async (currentPassword) => {
      const user = await insertUser({
        email: 'google-password@example.com',
        provider: 'google',
        providerId: 'google-password',
        password: CREDENTIAL_PASSWORD,
      });
      const token = signAccessToken({
        sub: user._id.toHexString(),
        email: user.email,
        role: user.role,
      });
      const path = '/api/v1/account/deactivate';
      const denied = await request(app)
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmation: 'DEACTIVATE', currentPassword });
      expect(denied.status).toBe(400);
      expect((await findUserById(user._id))?.status).toBe('active');
      const accepted = await request(app)
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmation: 'DEACTIVATE', currentPassword: CREDENTIAL_PASSWORD });
      expect(accepted.status).toBe(200);
      expect((await findUserById(user._id))?.status).toBe('deactivated');
    }
  );

  it('preserves deactivation without a password for a social-only account', async () => {
    const user = await insertUser({
      email: 'social-only@example.com',
      provider: 'google',
      providerId: 'social-only',
    });
    const token = signAccessToken({
      sub: user._id.toHexString(),
      email: user.email,
      role: user.role,
    });
    const accepted = await request(app)
      .post('/api/v1/account/deactivate')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'DEACTIVATE' });
    expect(accepted.status).toBe(200);
    expect((await findUserById(user._id))?.status).toBe('deactivated');
  });
});
