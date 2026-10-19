import type { Request } from 'express';
import type { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { env } from '../config/env';
import { hashToken, isRefreshTokenActive, refreshTokensCollection } from '../models/refresh-token';
import { requireBrowserSession } from '../services/native-session.service';
import { activeSessionUser } from '../services/session-access.service';
import { AppError } from '../utils/AppError';
import { OIDC_BINDINGS_COLLECTION } from '../models/oidc';
type Binding = {
  _id: string;
  userId: string;
  browserSessionId: ObjectId;
  sessionVersion: number;
  expiresAt: Date;
};
export const oidcBindings = () => getDb().collection<Binding>(OIDC_BINDINGS_COLLECTION);

export async function mainBrowserSession(req: Request) {
  const raw: unknown = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (typeof raw !== 'string' || !raw) throw AppError.unauthorized('Please sign in again.');
  const tokenHash = hashToken(raw);
  const session = await requireBrowserSession(tokenHash);
  if (
    session.tokenHash !== tokenHash &&
    (!session.previousValidUntil || session.previousValidUntil.getTime() <= Date.now())
  ) {
    throw AppError.unauthorized('Please sign in again.');
  }
  if ((session.sessionVersion ?? 0) !== (session.owner.sessionVersion ?? 0)) {
    throw AppError.unauthorized('Please sign in again.');
  }
  if (!session.owner.emailVerified)
    throw AppError.forbidden('Verify your email before continuing.');
  return session;
}

export async function boundAccount(grantId?: string, userId?: string) {
  if (!grantId || !userId) return undefined;
  const binding = await oidcBindings().findOne({
    _id: grantId,
    userId,
    expiresAt: { $gt: new Date() },
  });
  if (!binding) return undefined;
  const session = await refreshTokensCollection().findOne({ _id: binding.browserSessionId });
  if (
    !session ||
    session.nativeClientId ||
    !isRefreshTokenActive(session) ||
    session.user.toHexString() !== userId
  ) {
    return undefined;
  }
  try {
    const user = await activeSessionUser(userId, binding.sessionVersion);
    return user.emailVerified === true && (session.sessionVersion ?? 0) === binding.sessionVersion
      ? user
      : undefined;
  } catch (error) {
    if (error instanceof AppError && [401, 403].includes(error.statusCode)) return undefined;
    throw error;
  }
}
