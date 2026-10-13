import type { AccountLinkMethod } from '@shared/account-auth';
import type { EmailVerificationDelivery } from '@shared/email-verification';
import { MongoServerError } from 'mongodb';
import crypto from 'node:crypto';
import { env } from '../config/env';
import {
  accountLinkVerifications,
  type AccountLinkVerification,
} from '../models/account-link-verification';
import type { User } from '../models/users';
import { AppError } from '../utils/AppError';
import { ACCOUNT_LINK_TTL_MS, sealAccountLinkProof } from './account-link-proof';
import { deliverAuthMail } from './auth-mail.service';
import { compose } from './mail-template';
import { requireUnlinkedMethod } from './account-link-availability';

const names = { local: 'Public Login', google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' };
const hash = (user: User, method: AccountLinkMethod, generation: string, code: string) =>
  crypto
    .createHmac('sha256', env.JWT_SECRET_ACCESS)
    .update(
      JSON.stringify(['account-link', user._id.toHexString(), user.email, method, generation, code])
    )
    .digest('hex');
const invalid = () =>
  AppError.badRequest(
    'The verification code is invalid or expired. Request a new code if needed.',
    'email-link-invalid'
  );

export async function requestAccountLinkCode(
  user: User,
  sourceTokenHash: string,
  method: AccountLinkMethod
): Promise<EmailVerificationDelivery> {
  const account = await requireUnlinkedMethod(user, method);
  const collection = accountLinkVerifications();
  const previous = await collection.findOne({ _id: account._id });
  let code: string;
  do {
    code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  } while (
    previous &&
    hash(account, previous.method, previous.generation, code) === previous.codeHash
  );
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCOUNT_LINK_TTL_MS);
  const resendAvailableAt = new Date(now.getTime() + 60_000);
  const record: Omit<AccountLinkVerification, '_id'> = {
    user: account._id,
    email: account.email,
    method,
    sourceTokenHash,
    generation: crypto.randomBytes(32).toString('hex'),
    codeHash: '',
    codeExpiresAt: expiresAt,
    expiresAt,
    resendAvailableAt,
    failedAttempts: 0,
    verifiedAt: null,
    consumedAt: null,
  };
  record.codeHash = hash(account, method, record.generation, code);
  try {
    await collection.findOneAndUpdate(
      { _id: account._id, resendAvailableAt: { $lte: now } },
      { $set: record },
      { upsert: true }
    );
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    throw AppError.tooManyRequests(
      'Please wait one minute before requesting another verification code.',
      'email-link-cooldown'
    );
  }
  const delivery = await deliverAuthMail(
    compose(
      account.email,
      `Link ${names[method]} to your Vetify account`,
      `Your Vetify verification code is ${code}.\n\nEnter this code to link ${names[method]}. It expires in 5 minutes. A new code replaces the previous code.\n\nIf you did not request this, do not share this code.`
    )
  );
  return {
    sent: delivery.delivered && env.AUTH_MAIL_TRANSPORT === 'http',
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
  };
}
export async function verifyAccountLinkCode(
  user: User,
  sourceTokenHash: string,
  method: AccountLinkMethod,
  code: string
) {
  const account = await requireUnlinkedMethod(user, method);
  const now = new Date();
  const active = {
    _id: account._id,
    email: account.email,
    method,
    sourceTokenHash,
    verifiedAt: null,
    consumedAt: null,
    codeExpiresAt: { $gt: now },
    failedAttempts: { $lt: 5 },
  };
  const collection = accountLinkVerifications();
  const challenge = await collection.findOne(active);
  if (!challenge || !/^[0-9]{6}$/.test(code)) throw invalid();
  const codeHash = hash(account, method, challenge.generation, code);
  const current = { ...active, generation: challenge.generation };
  if (
    !crypto.timingSafeEqual(Buffer.from(codeHash, 'hex'), Buffer.from(challenge.codeHash, 'hex'))
  ) {
    await collection.updateOne(current, { $inc: { failedAttempts: 1 } });
    throw invalid();
  }
  const expiresAt = new Date(Date.now() + ACCOUNT_LINK_TTL_MS);
  const verified = await collection.findOneAndUpdate(
    { ...current, codeHash, codeExpiresAt: { $gt: new Date() } },
    { $set: { verifiedAt: new Date(), expiresAt } },
    { returnDocument: 'after' }
  );
  if (!verified) throw invalid();
  return sealAccountLinkProof({
    userId: account._id.toHexString(),
    email: account.email,
    sourceTokenHash,
    method,
    generation: challenge.generation,
    expiresAt: expiresAt.getTime(),
  });
}
