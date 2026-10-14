import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { emailVerificationsCollection } from '../../../models/email-verification';
import { findUserById } from '../../../models/users';
import {
  allowResend,
  challenge,
  lastCode,
  otherCode,
  resend,
  setupVerificationDb,
  signup,
  verify,
} from './email-verification-fixtures';

setupVerificationDb();

describe('email confirmation code security', () => {
  it('rejects malformed codes without consuming valid guesses', async () => {
    const account = await signup();
    const code = lastCode();
    for (const malformed of ['12345', '1234567', 'abcdef', '１２３４５６', 123456, null]) {
      expect((await verify(account.body.accessToken, malformed)).status).toBe(400);
    }
    expect((await challenge(account.body.user.id))?.failedAttempts).toBe(0);
    expect((await verify(account.body.accessToken, code)).status).toBe(200);
  });

  it('rejects a wrong code and allows the correct code before the guess limit', async () => {
    const account = await signup();
    const code = lastCode();
    const rejected = await verify(account.body.accessToken, otherCode(code));
    expect(rejected.status).toBe(400);
    expect(rejected.body.reason).toBe('email-verification-invalid');
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
    expect((await verify(account.body.accessToken, code)).status).toBe(200);
  });

  it('locks a code after five incorrect guesses, including a subsequent correct guess', async () => {
    const account = await signup();
    const code = lastCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await verify(account.body.accessToken, otherCode(code))).status).toBe(400);
    }
    expect((await challenge(account.body.user.id))?.failedAttempts).toBe(5);
    expect((await verify(account.body.accessToken, code)).status).toBe(400);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
  });

  it('rejects an expired code', async () => {
    const account = await signup();
    const code = lastCode();
    await emailVerificationsCollection().updateOne(
      { user: new ObjectId(account.body.user.id) },
      { $set: { expiresAt: new Date(Date.now() - 1) } }
    );
    expect((await verify(account.body.accessToken, code)).status).toBe(400);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(false);
  });

  it('binds a code to its own account and never lets a consumed code verify another account', async () => {
    const first = await signup('first@example.com');
    const firstCode = lastCode();
    const second = await signup('second@example.com');
    if (lastCode() === firstCode) {
      await allowResend(second.body.user.id);
      await resend(second.body.accessToken);
    }
    expect(lastCode()).not.toBe(firstCode);
    expect((await verify(second.body.accessToken, firstCode)).status).toBe(400);
    expect((await verify(first.body.accessToken, firstCode)).status).toBe(200);
    expect((await verify(second.body.accessToken, firstCode)).status).toBe(400);
    expect((await findUserById(second.body.user.id))?.emailVerified).toBe(false);
    expect((await verify(second.body.accessToken, lastCode())).status).toBe(200);
  });

  it('allows only one concurrent confirmation to consume a code', async () => {
    const account = await signup();
    const code = lastCode();
    const responses = await Promise.all([
      verify(account.body.accessToken, code),
      verify(account.body.accessToken, code),
    ]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect((await findUserById(account.body.user.id))?.emailVerified).toBe(true);
  });
});
