import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { emailVerificationsCollection } from '../../../models/email-verifications';
import { hashToken } from '../../../models/refresh-token';
import { findUserByEmail, usersCollection } from '../../../models/users';
import * as mail from '../../../services/mail.service';
import {
  app,
  confirm,
  credentials,
  resend,
  setupVerificationTests,
  signup,
  verificationToken,
} from './email-verification-fixtures';

setupVerificationTests();

async function liftCooldown() {
  const user = (await findUserByEmail(credentials.email))!;
  await emailVerificationsCollection().updateOne(
    { _id: user._id },
    { $set: { requestedAt: new Date(0) } }
  );
}

describe('verification resends and delivery failures', () => {
  it('atomically limits concurrent resends and invalidates the replaced link', async () => {
    const response = await signup();
    const old = verificationToken();
    await liftCooldown();
    const responses = await Promise.all([
      resend(response.body.accessToken),
      resend(response.body.accessToken),
      resend(response.body.accessToken),
    ]);
    expect(responses.map((reply) => reply.status).sort()).toEqual([200, 429, 429]);
    expect(mail.recentMail()).toHaveLength(2);
    expect(await emailVerificationsCollection().countDocuments()).toBe(1);
    expect((await confirm(old)).status).toBe(400);
    expect((await confirm(verificationToken())).status).toBe(200);
  });

  it('preserves saved signup and its session when sending verification fails', async () => {
    const sender = vi.spyOn(mail, 'sendMail').mockRejectedValueOnce(new Error('mail offline'));
    const response = await signup();
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect((await findUserByEmail(credentials.email))?.emailVerified).toBe(false);
    const undelivered = verificationToken(sender.mock.calls[0][0].text);
    expect((await confirm(undelivered)).status).toBe(400);
    const preferences = await request(app)
      .get('/api/v1/account/preferences')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(preferences.status).toBe(200);
    expect((await resend(response.body.accessToken)).status).toBe(429);
  });

  it('reports a failed resend honestly and preserves the account cooldown', async () => {
    const response = await signup();
    await liftCooldown();
    const sender = vi.spyOn(mail, 'sendMail').mockRejectedValueOnce(new Error('mail offline'));
    const failed = await resend(response.body.accessToken);
    expect(failed.status).toBe(503);
    expect(failed.body.reason).toBe('verification-delivery');
    expect(failed.body.error).not.toContain('mail offline');
    expect((await confirm(verificationToken(sender.mock.calls[0][0].text))).status).toBe(400);
    expect((await resend(response.body.accessToken)).status).toBe(429);
  });

  it('does not overwrite a newer link when cleanup for an older failed send finishes late', async () => {
    const response = await signup();
    await liftCooldown();
    let fail!: () => void;
    let started!: () => void;
    const paused = new Promise<void>((resolve) => (started = resolve));
    vi.spyOn(mail, 'sendMail').mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          fail = () => reject(new Error('mail offline'));
          started();
        })
    );
    const first = resend(response.body.accessToken).then((reply) => reply);
    await paused;
    await liftCooldown();
    let newest = '';
    try {
      expect((await resend(response.body.accessToken)).status).toBe(200);
      newest = verificationToken();
    } finally {
      fail();
    }
    expect((await first).status).toBe(503);
    const stored = await emailVerificationsCollection().findOne({ hash: hashToken(newest) });
    expect(stored?.consumedAt).toBeNull();
    expect((await confirm(newest)).status).toBe(200);
    expect((await usersCollection().findOne({ email: credentials.email }))?.emailVerified).toBe(
      true
    );
  });
});
