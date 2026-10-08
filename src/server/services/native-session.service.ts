import { ObjectId } from 'mongodb';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { NATIVE_CLIENT_ID } from '../../shared/native-auth';
import { env } from '../config/env';
import {
  activeNativeSession,
  nativeSessionsCollection,
  revokeNativeSession,
} from '../models/native-session';
import {
  findRefreshTokenWithOwner,
  hashToken,
  isRefreshTokenActive,
  refreshTokensCollection,
} from '../models/refresh-token';
import { toPublicUser, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { accessTokenClaimsFor } from './auth.service';
import { blockedMessage, currentStatus } from './user-status.service';

export async function requireActiveNativeAccount(user: User) {
  const status = await currentStatus(user);
  if (status !== 'active') {
    throw AppError.forbidden(blockedMessage(status), `account-${status}`);
  }
}

export async function requireBrowserSession(tokenHash: string) {
  const token = await findRefreshTokenWithOwner(tokenHash);
  if (!token?.owner || token.nativeClientId || !isRefreshTokenActive(token)) {
    throw AppError.unauthorized('Your main system session expired.', 'login-required');
  }
  await requireActiveNativeAccount(token.owner);
  return { ...token, owner: token.owner };
}

async function mintNativeCredentials(user: User, sessionId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_DAYS * 86_400_000);
  const refreshToken = crypto.randomBytes(32).toString('hex');
  await refreshTokensCollection().insertOne({
    _id: new ObjectId(),
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    nativeClientId: NATIVE_CLIENT_ID,
    nativeSessionId: sessionId,
  });
  const updated = await nativeSessionsCollection().updateOne(
    { _id: new ObjectId(sessionId), revokedAt: null },
    { $set: { expiresAt } }
  );
  if (!updated.matchedCount) {
    await revokeNativeSession(sessionId);
    throw AppError.unauthorized('Your mobile session was revoked.');
  }
  const publicUser = toPublicUser(user);
  const accessToken = jwt.sign(
    { ...accessTokenClaimsFor(publicUser), nativeSessionId: sessionId },
    env.JWT_SECRET_ACCESS,
    { expiresIn: `${env.ACCESS_TOKEN_MINUTES}m` }
  );
  return { accessToken, refreshToken, user: publicUser };
}

export async function createNativeSession(user: User) {
  await requireActiveNativeAccount(user);
  const sessionId = new ObjectId();
  await nativeSessionsCollection().insertOne({
    _id: sessionId,
    user: user._id,
    revokedAt: null,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000),
  });
  return mintNativeCredentials(user, sessionId.toHexString());
}

export async function refreshNativeSession(raw: string) {
  const tokenHash = hashToken(raw);
  const token = await findRefreshTokenWithOwner(tokenHash);
  const sessionId = token?.nativeSessionId;
  if (!token?.owner || !sessionId || token.nativeClientId !== NATIVE_CLIENT_ID) {
    throw AppError.unauthorized('Invalid mobile refresh token.');
  }
  if (token.revokedAt) {
    await revokeNativeSession(sessionId);
    throw AppError.unauthorized('That mobile refresh token has already been used.');
  }
  if (
    !isRefreshTokenActive(token) ||
    !(await activeNativeSession(sessionId, token.user.toString()))
  ) {
    await revokeNativeSession(sessionId);
    throw AppError.unauthorized('Your mobile session expired.');
  }
  try {
    await requireActiveNativeAccount(token.owner);
  } catch (error) {
    await revokeNativeSession(sessionId);
    throw error;
  }
  const now = new Date();
  const claimed = await refreshTokensCollection().findOneAndUpdate(
    { tokenHash, nativeSessionId: sessionId, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
  if (!claimed) {
    await revokeNativeSession(sessionId);
    throw AppError.unauthorized('That mobile refresh token has already been used.');
  }
  return mintNativeCredentials(token.owner, sessionId);
}

export async function logoutNativeSession(raw: string) {
  const token = await refreshTokensCollection().findOne({
    tokenHash: hashToken(raw),
    nativeClientId: NATIVE_CLIENT_ID,
  });
  if (token?.nativeSessionId) await revokeNativeSession(token.nativeSessionId);
}
