import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env';
import { findUserById } from '../../../models/users';
import { sendMail } from '../../../services/mail.service';
import {
  allowResend,
  challenge,
  lastCode,
  mailFetch,
  postedMail,
  recentMail,
  resend,
  setupVerificationDb,
  signup,
  verify,
} from './email-verification-fixtures';

setupVerificationDb();

describe('email confirmation delivery and resend', () => {
  it('enforces cooldown without sending another email', async () => {
    const account = await signup();
    const response = await resend(account.body.accessToken);
    expect(response.status).toBe(429);
    expect(response.body.reason).toBe('email-verification-cooldown');
    expect(recentMail()).toHaveLength(1);
    expect(mailFetch).toHaveBeenCalledTimes(1);
  });

  it('atomically allows one concurrent resend and invalidates the old code', async () => {
    const account = await signup();
    const oldCode = lastCode();
    const generation = (await challenge(account.body.user.id))?.generation;
    await allowResend(account.body.user.id);
    const responses = await Promise.all([
      resend(account.body.accessToken),
      resend(account.body.accessToken),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(responses.find((response) => response.status === 200)?.body.sent).toBe(true);
    expect(recentMail()).toHaveLength(2);
    expect(mailFetch).toHaveBeenCalledTimes(2);
    expect((await challenge(account.body.user.id))?.generation).not.toBe(generation);
    const newCode = lastCode();
    expect(newCode).not.toBe(oldCode);
    expect((await verify(account.body.accessToken, oldCode)).status).toBe(400);
    expect((await verify(account.body.accessToken, newCode)).status).toBe(200);
  });

  it('keeps the created account when delivery fails and permits an immediate retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mailFetch.mockResolvedValueOnce(new Response('provider unavailable', { status: 503 }));
    const account = await signup();
    expect(account.status).toBe(200);
    expect(account.body.emailVerification.sent).toBe(false);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
    expect(typeof account.body.accessToken).toBe('string');
    const response = await resend(account.body.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.sent).toBe(true);
    expect(mailFetch).toHaveBeenCalledTimes(2);
    expect((await verify(account.body.accessToken, lastCode())).status).toBe(200);
  });

  it('reports a log-only message as unsent and retains the resend cooldown', async () => {
    env.AUTH_MAIL_TRANSPORT = 'log';
    const account = await signup();
    expect(account.status).toBe(200);
    expect(account.body.emailVerification.sent).toBe(false);
    expect(recentMail()).toHaveLength(1);
    expect(mailFetch).not.toHaveBeenCalled();
    expect((await resend(account.body.accessToken)).status).toBe(429);
  });

  it('resets exhausted guesses when a fresh code is sent', async () => {
    const account = await signup();
    const oldCode = lastCode();
    const wrong = String((Number(oldCode) + 1) % 1_000_000).padStart(6, '0');
    for (let attempt = 0; attempt < 5; attempt++) await verify(account.body.accessToken, wrong);
    await allowResend(account.body.user.id);
    expect((await resend(account.body.accessToken)).status).toBe(200);
    expect((await challenge(account.body.user.id))?.failedAttempts).toBe(0);
    expect((await verify(account.body.accessToken, lastCode())).status).toBe(200);
  });

  it('uses separate provider credentials and sender settings for auth and professional mail', async () => {
    expect((await signup()).body.emailVerification.sent).toBe(true);
    await sendMail({ to: 'vet@example.com', subject: 'Application approved', text: 'Approved.' });
    expect(mailFetch).toHaveBeenCalledTimes(2);
    expect(mailFetch.mock.calls[0]).toEqual([
      'https://mail.test/emails',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer verification-test-key' }),
      }),
    ]);
    expect(mailFetch.mock.calls[1]).toEqual([
      'https://professional.mail.test/emails',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer professional-test-key' }),
      }),
    ]);
    expect(postedMail(0).from).toBe('Vetify Auth <auth@vetify.test>');
    expect(postedMail(1).from).toBe('Vetify Applications <apply@vetify.test>');
  });

  it('does not use the professional API key when the dedicated auth key is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.AUTH_MAIL_API_KEY = undefined;
    expect(env.MAIL_API_KEY).toBe('professional-test-key');
    const account = await signup();
    expect(account.status).toBe(200);
    expect(account.body.emailVerification.sent).toBe(false);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
    expect(mailFetch).not.toHaveBeenCalled();
  });

  it('redraws a random code collision so the previous code cannot confirm after resend', async () => {
    const account = await signup();
    const oldCode = lastCode();
    vi.mocked(crypto.randomInt)
      .mockImplementationOnce(() => Number(oldCode))
      .mockImplementationOnce(() => Number(oldCode) + 1);
    await allowResend(account.body.user.id);
    expect((await resend(account.body.accessToken)).status).toBe(200);
    expect(lastCode()).not.toBe(oldCode);
    expect((await verify(account.body.accessToken, oldCode)).status).toBe(400);
    expect((await verify(account.body.accessToken, lastCode())).status).toBe(200);
  });
});
