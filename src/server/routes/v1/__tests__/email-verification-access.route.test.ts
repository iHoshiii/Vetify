import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CLIENT } from './native-auth-fixtures';
import {
  app,
  lastCode,
  PASSWORD,
  resend,
  setupVerificationDb,
  signup,
  verify,
} from './email-verification-fixtures';
import { insertUser, usersCollection } from '../../../models/users';
import { createAuthPayloadFor } from '../../../services/auth.service';
import { createNativeSession } from '../../../services/native-session.service';
import { insertAuthIdentity } from '../../../models/auth-identities';

setupVerificationDb();

const readPreferences = (token: string) =>
  request(app).get('/api/v1/account/preferences').set('Authorization', `Bearer ${token}`);

describe('mandatory local email verification', () => {
  it.each(['', '/native'] as const)(
    'restricts signup and subsequent login sessions on %s until the code is confirmed',
    async (surface) => {
      const created = await signup('pending@example.com', surface);
      expect(created.status).toBe(200);
      expect(created.body.user.emailVerified).toBe(false);
      const code = lastCode();
      const login = await request(app)
        .post(`/api/v1/auth${surface}/login`)
        .send({ email: 'pending@example.com', password: PASSWORD });
      expect(login.status).toBe(200);
      const token = login.body.accessToken;
      for (const path of [
        '/api/v1/account/preferences',
        '/api/v1/auth/subscription',
        '/api/v1/account/login-methods',
        '/api/v1/admin/metrics',
      ]) {
        const result = await request(app).get(path).set('Authorization', `Bearer ${token}`);
        expect(result.status).toBe(403);
        expect(result.body.reason).toBe('email-verification-required');
      }
      for (const path of ['/api/v1/auth/introspect', '/api/v1/chat']) {
        const result = await request(app)
          .post(path)
          .set('Authorization', `Bearer ${token}`)
          .send({ message: 'Hello' });
        expect(result.status).toBe(403);
        expect(result.body.reason).toBe('email-verification-required');
      }
      expect((await resend(token, surface)).body.reason).toBe('email-verification-cooldown');
      expect((await verify(token, '999999', surface)).status).toBe(400);
      expect((await verify(token, code, surface)).body.user.emailVerified).toBe(true);
      expect((await readPreferences(token)).status).toBe(200);
      expect(
        (await request(app).post('/api/v1/auth/introspect').set('Authorization', `Bearer ${token}`))
          .status
      ).toBe(200);
    }
  );

  it('keeps browser refresh and logout available without granting app access', async () => {
    const browser = request.agent(app);
    const signupResponse = await browser.post('/api/v1/auth/signup').send({
      name: 'Owner',
      email: 'refresh@example.com',
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect(signupResponse.status).toBe(200);
    const refreshed = await browser.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.emailVerified).toBe(false);
    expect((await readPreferences(refreshed.body.accessToken)).status).toBe(403);
    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
  });

  it('blocks cookie-only mobile handoff and stale existing sessions until verification', async () => {
    const browser = request.agent(app);
    await browser.post('/api/v1/auth/signup').send({
      name: 'Owner',
      email: 'handoff@example.com',
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    const denied = await browser.post('/api/v1/auth/native/handoff').send(CLIENT);
    expect(denied.status).toBe(403);
    expect(denied.body.reason).toBe('email-verification-required');
    const account = await insertUser({
      email: 'legacy@example.com',
      password: PASSWORD,
      provider: 'local',
      emailVerified: false,
    });
    const native = await createNativeSession(account);
    const oldBrowser = await createAuthPayloadFor(account);
    for (const token of [native.accessToken, oldBrowser.accessToken])
      expect((await readPreferences(token)).status).toBe(403);
  });

  it('keeps a linked social identity restricted when the original local email is unverified', async () => {
    const local = await insertUser({
      email: 'linked@example.com',
      password: PASSWORD,
      provider: 'local',
      emailVerified: false,
    });
    await insertAuthIdentity({ user: local._id, provider: 'google', providerId: 'linked-google' });
    const token = (await createAuthPayloadFor(local)).accessToken;
    expect((await readPreferences(token)).status).toBe(403);
    await usersCollection().updateOne({ _id: local._id }, { $set: { emailVerified: true } });
    expect((await readPreferences(token)).status).toBe(200);
  });

  it('preserves access for social accounts and anonymous public pages', async () => {
    const social = await insertUser({
      email: 'social@example.com',
      provider: 'google',
      providerId: 'social',
      emailVerified: false,
    });
    const token = (await createAuthPayloadFor(social)).accessToken;
    expect((await readPreferences(token)).status).toBe(200);
    expect((await request(app).get('/api/v1/blogs')).status).toBe(200);
  });
});
