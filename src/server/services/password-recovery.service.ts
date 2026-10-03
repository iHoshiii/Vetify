import crypto from 'node:crypto';
import { env, isProduction } from '../config/env';
import { hashToken, revokeAllRefreshTokensForUser } from '../models/refresh-token';
import {
  clearPasswordRecovery,
  consumePasswordRecovery,
  findPasswordRecoveryAccount,
  findPasswordRecoveryAccountByHash,
  issuePasswordRecovery,
} from '../models/users/password-recovery';
import { disconnectUserSessions } from '../realtime/hub';
import { sendMail } from './mail.service';
import { currentStatus } from './user-status.service';

export const RECOVERY_EXPIRY_MS = 30 * 60 * 1000;
export const RECOVERY_MESSAGE =
  'If that email has an eligible account, we will send a password recovery link. Check your inbox and spam folder.';

export async function requestPasswordRecovery(email: string): Promise<void> {
  if (isProduction && env.MAIL_TRANSPORT !== 'http') {
    console.error('[auth] Password recovery email delivery is not configured');
    return;
  }
  const account = await findPasswordRecoveryAccount(email);
  if (!account || (await currentStatus(account)) !== 'active') return;
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const user = await issuePasswordRecovery(email, hash, new Date(Date.now() + RECOVERY_EXPIRY_MS));
  if (!user) return;
  const link = new URL('/reset-password', env.CLIENT_ORIGIN);
  link.hash = `token=${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your Vetify password',
      text: `Choose a new password here: ${link.toString()}\n\nThis link expires in 30 minutes and works once. If you did not request it, you can ignore this email.`,
    });
  } catch {
    await clearPasswordRecovery(user._id, hash).catch(() => {
      console.error('[auth] An undelivered password recovery link could not be cleared');
    });
    console.error('[auth] Password recovery email could not be delivered');
  }
}

export async function resetPassword(token: string, password: string): Promise<boolean> {
  const hash = hashToken(token);
  const account = await findPasswordRecoveryAccountByHash(hash);
  if (!account || (await currentStatus(account)) !== 'active') return false;
  const user = await consumePasswordRecovery(hash, password);
  if (!user) return false;
  disconnectUserSessions(user._id.toString(), user.sessionVersion ?? 0);
  try {
    await revokeAllRefreshTokensForUser(user._id, user.sessionVersion ?? 0);
  } catch {
    console.error('[auth] Old refresh sessions could not be marked revoked after password reset');
  }
  return true;
}
