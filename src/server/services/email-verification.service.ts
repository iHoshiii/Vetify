import type { EmailVerificationDelivery } from '@shared/email-verification';
import { MongoServerError } from 'mongodb';
import crypto from 'node:crypto';

import { env } from '../config/env';
import { emailVerificationsCollection } from '../models/email-verification';
import { usersCollection, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { deliverAuthMail } from './auth-mail.service';
import { compose } from './mail-template';

const EXPIRY_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function requireLocalUnverified(user: User): void {
  if (user.provider !== 'local') {
    throw AppError.badRequest(
      'Email confirmation is only available for email/password accounts.',
      'email-verification-unavailable'
    );
  }
  if (user.emailVerified) {
    throw AppError.conflict('Your email is already confirmed.', 'email-already-verified');
  }
}

function hashCode(user: User, generation: string, code: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET_ACCESS)
    .update(
      JSON.stringify(['email-verification', user._id.toHexString(), user.email, generation, code])
    )
    .digest('hex');
}

function invalidCode(): AppError {
  return AppError.badRequest(
    'The confirmation code is invalid or expired. Request a new code if needed.',
    'email-verification-invalid'
  );
}

export async function requestEmailVerification(user: User): Promise<EmailVerificationDelivery> {
  requireLocalUnverified(user);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_MS);
  let resendAvailableAt = new Date(now.getTime() + RESEND_MS);
  const generation = crypto.randomBytes(32).toString('hex');
  const collection = emailVerificationsCollection();
  const previous = await collection.findOne({ _id: user._id });
  let code: string;
  do {
    code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  } while (previous && hashCode(user, previous.generation, code) === previous.codeHash);

  try {
    await collection.findOneAndUpdate(
      { _id: user._id, resendAvailableAt: { $lte: now } },
      {
        $set: {
          user: user._id,
          email: user.email,
          generation,
          codeHash: hashCode(user, generation, code),
          expiresAt,
          resendAvailableAt,
          failedAttempts: 0,
          consumedAt: null,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    if (!(err instanceof MongoServerError) || err.code !== 11000) throw err;
    throw AppError.tooManyRequests(
      'Please wait one minute before requesting another confirmation code.',
      'email-verification-cooldown'
    );
  }

  const text = [
    `Your Vetify email confirmation code is ${code}.`,
    'Enter this six-digit code in Vetify to confirm your email address.',
    'This code expires in 10 minutes. A new code replaces any previous code.',
    'If you did not create this account, you can ignore this email.',
  ].join('\n\n');
  const delivery = await deliverAuthMail(compose(user.email, 'Confirm your Vetify email', text));
  if (!delivery.delivered) {
    resendAvailableAt = new Date();
    await collection.updateOne({ _id: user._id, generation }, { $set: { resendAvailableAt } });
  }

  return {
    sent: delivery.delivered && env.AUTH_MAIL_TRANSPORT === 'http',
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
  };
}

export async function confirmEmailVerification(user: User, code: string): Promise<User> {
  requireLocalUnverified(user);
  if (code.length !== 6 || !/^[0-9]{6}$/.test(code)) throw invalidCode();
  const collection = emailVerificationsCollection();
  const active = {
    _id: user._id,
    user: user._id,
    email: user.email,
    expiresAt: { $gt: new Date() },
    consumedAt: null,
    failedAttempts: { $lt: MAX_ATTEMPTS },
  };
  const verification = await collection.findOne(active);
  if (!verification) throw invalidCode();
  const codeHash = hashCode(user, verification.generation, code);
  const current = { ...active, generation: verification.generation };
  if (
    !crypto.timingSafeEqual(Buffer.from(codeHash, 'hex'), Buffer.from(verification.codeHash, 'hex'))
  ) {
    await collection.updateOne(current, { $inc: { failedAttempts: 1 } });
    throw invalidCode();
  }
  const consumed = await collection.findOneAndUpdate(
    { ...current, codeHash, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!consumed) throw invalidCode();
  const updated = await usersCollection().findOneAndUpdate(
    { _id: user._id, email: user.email, provider: 'local', emailVerified: false },
    { $set: { emailVerified: true, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { password: 0 } }
  );
  if (!updated) throw invalidCode();
  return updated;
}
