import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { findUserById, findUserWithPasswordByEmail } from '../../../models/users';
import {
  app,
  challenge,
  lastCode,
  mailFetch,
  PASSWORD,
  postedMail,
  recentMail,
  setupVerificationDb,
  signup,
  verify,
  type AuthSurface,
} from './email-verification-fixtures';

setupVerificationDb();

describe('local signup email verification', () => {
  it.each(['', '/native'] as AuthSurface[])(
    'sends six digits to the normalized account address on the %s signup interface',
    async (surface) => {
      const response = await signup('  VERIFY@EXAMPLE.COM  ', surface);
      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        email: 'verify@example.com',
        emailVerified: false,
      });
      expect(response.body.emailVerification).toMatchObject({ sent: true });
      expect(new Date(response.body.emailVerification.expiresAt).getTime()).toBeGreaterThan(
        Date.now()
      );
      expect(new Date(response.body.emailVerification.resendAvailableAt).getTime()).toBeGreaterThan(
        Date.now()
      );
      expect(typeof response.body.accessToken).toBe('string');
      if (surface) expect(response.body.refreshToken).toMatch(/^[a-f0-9]{64}$/);
      else expect(response.headers['set-cookie']).toBeDefined();
      expect(recentMail()).toHaveLength(1);
      expect(recentMail()[0].to).toBe('verify@example.com');
      const code = lastCode();
      expect(postedMail()).toMatchObject({ to: ['verify@example.com'] });
      expect(postedMail().text).toContain(code);
      expect(mailFetch).toHaveBeenCalledWith(
        'https://mail.test/emails',
        expect.objectContaining({ method: 'POST' })
      );
      expect(response.body.code).toBeUndefined();
      expect(response.body.emailVerification.code).toBeUndefined();
      expect(response.body.emailVerification.codeHash).toBeUndefined();
      const stored = await challenge(response.body.user.id);
      expect(stored?.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(Object.values(stored!)).not.toContain(code);
      expect((await findUserWithPasswordByEmail('verify@example.com'))?.emailVerified).toBe(false);
    }
  );

  it.each(['', '/native'] as AuthSurface[])(
    'persists successful confirmation and returns the updated user on the %s interface',
    async (surface) => {
      const registered = await signup('verify@example.com', surface);
      const confirmed = await verify(registered.body.accessToken, lastCode(), surface);
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.user).toMatchObject({
        id: registered.body.user.id,
        emailVerified: true,
      });
      expect(confirmed.body.user.password).toBeUndefined();
      expect((await findUserById(registered.body.user.id))?.emailVerified).toBe(true);
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'verify@example.com', password: PASSWORD });
      expect(login.status).toBe(200);
      expect(login.body.user.emailVerified).toBe(true);
      expect((await challenge(registered.body.user.id))?.consumedAt).toBeInstanceOf(Date);
    }
  );

  it('requires a signed-in account for browser and native confirmation or resend', async () => {
    for (const surface of ['', '/native']) {
      const responses = await Promise.all([
        request(app).post(`/api/v1/auth${surface}/email/verify`).send({ code: '123456' }),
        request(app).post(`/api/v1/auth${surface}/email/resend`),
      ]);
      expect(responses.map((response) => response.status)).toEqual([401, 401]);
    }
    expect(mailFetch).not.toHaveBeenCalled();
  });
});
