import type { AccountAuthContext } from '@shared/account-auth';
import type { Request } from 'express';

import { env } from '../config/env';
import { hashToken } from '../models/refresh-token';
import type { User } from '../models/users';
import { AppError } from '../utils/AppError';
import { requireBrowserSession } from './native-session.service';

function browserTokenHash(req: Request): string | null {
  const jar = req.cookies as Record<string, unknown> | undefined;
  const raw = jar?.[env.REFRESH_COOKIE_NAME] ?? jar?.refresh_token;
  return typeof raw === 'string' && raw ? hashToken(raw) : null;
}

export async function requireAccountBrowserSession(req: Request, actor: User) {
  const sourceTokenHash = browserTokenHash(req);
  if (!sourceTokenHash) throw AppError.unauthorized('Please sign in again.', 'login-required');
  const session = await requireBrowserSession(sourceTokenHash);
  if (!session.owner._id.equals(actor._id)) {
    throw AppError.unauthorized('Please sign in again.', 'login-required');
  }
  return { user: session.owner, sourceTokenHash };
}

export async function requireAccountCallbackSession(req: Request, context: AccountAuthContext) {
  if (browserTokenHash(req) !== context.sourceTokenHash) {
    throw AppError.unauthorized('Please sign in again.', 'session-expired');
  }
  const session = await requireBrowserSession(context.sourceTokenHash);
  if (session.owner._id.toHexString() !== context.userId) {
    throw AppError.unauthorized('Please sign in again.', 'session-expired');
  }
  return session.owner;
}
