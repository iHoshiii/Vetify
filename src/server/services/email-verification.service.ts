import crypto from 'node:crypto';
import type { ObjectId } from 'mongodb';
import { env, isProduction } from '../config/env';
import {
  consumeEmailVerification,
  findEmailVerification,
  invalidateEmailVerification,
  issueEmailVerification,
} from '../models/email-verifications';
import { hashToken } from '../models/refresh-token';
import { findUserById, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { sendMail } from './mail.service';
import { currentStatus } from './user-status.service';

export const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_MESSAGE =
  'Verification email sent. Check your inbox and spam folder.';
const DELIVERY_ERROR = 'We could not send the verification email. Please try again in one minute.';

async function eligibleAccount(user: User | null): Promise<boolean> {
  return !!(
    user &&
    user.provider === 'local' &&
    !user.emailVerified &&
    (await currentStatus(user)) === 'active'
  );
}

export async function requestEmailVerification(userId: ObjectId): Promise<void> {
  const user = await findUserById(userId);
  if (!(await eligibleAccount(user))) {
    throw AppError.forbidden(
      'Email verification is not available for this account.',
      'verification-unavailable'
    );
  }
  if (isProduction && env.MAIL_TRANSPORT !== 'http') {
    throw new AppError(503, DELIVERY_ERROR, 'verification-delivery');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const issued = await issueEmailVerification(
    user!._id,
    user!.email,
    hash,
    new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
  );
  if (!issued) {
    throw AppError.tooManyRequests(
      'Please wait one minute before requesting another verification email.',
      'verification-cooldown'
    );
  }
  const link = new URL('/verify-email', env.CLIENT_ORIGIN);
  link.hash = `token=${token}`;
  try {
    const fresh = await findUserById(userId);
    if (!(await eligibleAccount(fresh)) || fresh?.email !== issued.email) {
      throw AppError.forbidden(
        'Email verification is not available for this account.',
        'verification-unavailable'
      );
    }
    await sendMail({
      to: issued.email,
      subject: 'Verify your Vetify email',
      text: `Verify your email here: ${link.toString()}\n\nThis link expires in 24 hours and works once. If you did not request it, you can ignore this email.`,
      idempotencyKey: `email-verification/${hash}`,
    });
  } catch (error) {
    await invalidateEmailVerification(userId, hash).catch(() =>
      console.error('[auth] Undelivered verification link could not be invalidated')
    );
    if (error instanceof AppError) throw error;
    throw new AppError(503, DELIVERY_ERROR, 'verification-delivery');
  }
}

export async function sendSignupVerification(user: User): Promise<void> {
  try {
    await requestEmailVerification(user._id);
  } catch {
    console.error('[auth] Signup was saved but its verification email could not be sent');
  }
}

export async function confirmEmailVerification(token: string): Promise<boolean> {
  const hash = hashToken(token);
  const pending = await findEmailVerification(hash);
  if (!pending) return false;
  const user = await findUserById(pending._id);
  if (!(await eligibleAccount(user)) || user?.email !== pending.email) return false;
  return consumeEmailVerification(hash);
}
