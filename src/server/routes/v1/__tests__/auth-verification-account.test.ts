import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import * as verification from '../../../models/email-verifications';
import * as accounts from '../../../models/users';
import {
  findUserByEmail,
  insertUser,
  usersCollection,
  toPublicUser,
  type User,
  type UserDocument,
} from '../../../models/users';
import { accessTokenClaimsFor, signAccessToken } from '../../../services/auth.service';
import { recentMail } from '../../../services/mail.service';
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

function tokenFor(user: User) {
  return signAccessToken(accessTokenClaimsFor(toPublicUser(user), user.sessionVersion ?? 0));
}

const changes: Array<{ change: string; patch: Partial<UserDocument> }> = [
  { change: 'account restriction', patch: { status: 'banned' } },
  { change: 'changed email', patch: { email: 'changed@example.com' } },
  { change: 'linked OAuth identity', patch: { provider: 'google', providerId: 'google1' } },
  { change: 'already verified email', patch: { emailVerified: true } },
];

describe('verification account protection', () => {
  it('releases a token claim when the account write fails so the same link can be retried', async () => {
    await signup();
    const token = verificationToken();
    const collection = usersCollection();
    vi.spyOn(accounts, 'usersCollection').mockReturnValue(collection);
    vi.spyOn(collection, 'updateOne').mockRejectedValueOnce(new Error('Account update offline'));
    expect((await confirm(token)).status).toBe(500);
    vi.restoreAllMocks();
    expect((await confirm(token)).status).toBe(200);
    expect((await confirm(token)).status).toBe(400);
  });

  it.each(changes)(
    'rejects confirmation after $change at the final account write',
    async ({ patch }) => {
      await signup();
      const user = (await findUserByEmail(credentials.email))!;
      const token = verificationToken();
      const consume = verification.consumeEmailVerification;
      vi.spyOn(verification, 'consumeEmailVerification').mockImplementationOnce(async (hash) => {
        await usersCollection().updateOne({ _id: user._id }, { $set: patch });
        return consume(hash);
      });
      expect((await confirm(token)).status).toBe(400);
      expect((await usersCollection().findOne({ _id: user._id }))?.emailVerified).toBe(
        patch.emailVerified === true
      );
    }
  );

  it('refuses resends for OAuth and already verified accounts', async () => {
    for (const attrs of [
      { email: 'social@example.com', provider: 'google' as const, providerId: 'google1' },
      { ...credentials, emailVerified: true },
    ]) {
      const user = await insertUser(attrs);
      const response = await resend(tokenFor(user));
      expect(response.status).toBe(403);
      expect(response.body.reason).toBe('verification-unavailable');
    }
    expect(recentMail()).toHaveLength(0);
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses a %s account resend',
    async (status) => {
      const user = await insertUser({ ...credentials, status });
      expect((await resend(tokenFor(user))).status).toBe(403);
      expect(recentMail()).toHaveLength(0);
    }
  );

  it('uses the authenticated account rather than a supplied email recipient', async () => {
    const user = await insertUser(credentials);
    await insertUser({ ...credentials, email: 'other@example.com' });
    const response = await request(app)
      .post('/api/v1/auth/email-verification/request')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ email: 'other@example.com' });
    expect(response.status).toBe(200);
    expect(recentMail()[0].to).toBe(credentials.email);
    expect((await confirm(verificationToken())).status).toBe(200);
    expect((await findUserByEmail('other@example.com'))?.emailVerified).toBe(false);
  });
});
