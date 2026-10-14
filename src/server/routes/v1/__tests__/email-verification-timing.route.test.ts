import { describe, expect, it, vi } from 'vitest';
import { findUserById } from '../../../models/users';
import {
  freezeDate,
  lastCode,
  mailFetch,
  recentMail,
  resend,
  setupVerificationDb,
  signup,
  verify,
} from './email-verification-fixtures';

setupVerificationDb();

describe('email confirmation timing boundaries', () => {
  it('blocks resend at 59 seconds and allows it at exactly 60 seconds', async () => {
    const started = freezeDate();
    const account = await signup();
    expect(Date.parse(account.body.emailVerification.resendAvailableAt)).toBe(started + 60_000);
    vi.setSystemTime(started + 59_000);
    expect((await resend(account.body.accessToken)).status).toBe(429);
    expect(mailFetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(started + 60_000);
    const response = await resend(account.body.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.sent).toBe(true);
    expect(Date.parse(response.body.resendAvailableAt)).toBe(started + 120_000);
    expect(mailFetch).toHaveBeenCalledTimes(2);
  });

  it('accepts the code one millisecond before its five-minute expiry', async () => {
    const started = freezeDate();
    const account = await signup();
    const code = lastCode();
    expect(Date.parse(account.body.emailVerification.expiresAt)).toBe(started + 300_000);
    expect(recentMail().at(-1)?.text).toContain('expires in 5 minutes');
    vi.setSystemTime(started + 299_999);
    expect((await verify(account.body.accessToken, code)).status).toBe(200);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(true);
  });

  it('rejects an unconsumed correct code at exactly five minutes', async () => {
    const started = freezeDate();
    const account = await signup();
    const code = lastCode();
    vi.setSystemTime(started + 300_000);
    const response = await verify(account.body.accessToken, code);
    expect(response.status).toBe(400);
    expect(response.body.reason).toBe('email-verification-invalid');
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
  });

  it('starts another full minute of cooldown when a resend fails at the provider', async () => {
    const started = freezeDate();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const account = await signup();
    vi.setSystemTime(started + 60_000);
    mailFetch.mockResolvedValueOnce(new Response('API key is invalid', { status: 400 }));
    const failed = await resend(account.body.accessToken);
    expect(failed.status).toBe(200);
    expect(failed.body.sent).toBe(false);
    expect(Date.parse(failed.body.resendAvailableAt)).toBe(started + 120_000);
    vi.setSystemTime(started + 119_000);
    expect((await resend(account.body.accessToken)).status).toBe(429);
    expect(mailFetch).toHaveBeenCalledTimes(2);
    vi.setSystemTime(started + 120_000);
    expect((await resend(account.body.accessToken)).body.sent).toBe(true);
    expect(mailFetch).toHaveBeenCalledTimes(3);
  });

  it('gives each replacement five minutes and invalidates the previous code immediately', async () => {
    const started = freezeDate();
    const first = await signup('first@example.com');
    const firstOldCode = lastCode();
    const second = await signup('second@example.com');
    const secondOldCode = lastCode();
    vi.setSystemTime(started + 240_000);
    const firstReplacement = await resend(first.body.accessToken);
    const firstNewCode = lastCode();
    const secondReplacement = await resend(second.body.accessToken);
    const secondNewCode = lastCode();
    expect(firstReplacement.status).toBe(200);
    expect(secondReplacement.status).toBe(200);
    expect(Date.parse(firstReplacement.body.expiresAt)).toBe(started + 540_000);
    expect(Date.parse(secondReplacement.body.expiresAt)).toBe(started + 540_000);
    expect((await verify(first.body.accessToken, firstOldCode)).status).toBe(400);
    expect((await verify(second.body.accessToken, secondOldCode)).status).toBe(400);
    vi.setSystemTime(started + 539_999);
    expect((await verify(first.body.accessToken, firstNewCode)).status).toBe(200);
    vi.setSystemTime(started + 540_000);
    expect((await verify(second.body.accessToken, secondNewCode)).status).toBe(400);
    expect((await findUserById(second.body.user.id))?.emailVerified).toBe(false);
  });
});
