import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

import { env } from '../config/env';
import { RefreshToken, hashToken } from '../models/RefreshToken';
import type { UserDoc } from '../models/User';

export function signAccessToken(payload: object) {
  return jwt.sign(payload, env.JWT_SECRET_ACCESS, {
    expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
  });
}

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_DAYS);

  await RefreshToken.create({ tokenHash, user: userId, expiresAt });

  return { token, expiresAt };
}

export async function revokeRefreshTokenByHash(tokenHash: string) {
  const rt = await RefreshToken.findOne({ tokenHash });
  if (!rt) return false;
  rt.revokedAt = new Date();
  await rt.save();
  return true;
}

export async function findRefreshTokenByHash(tokenHash: string) {
  return RefreshToken.findOne({ tokenHash }).populate('user');
}

export async function createAuthPayloadFor(userDoc: UserDoc) {
  const publicUser = userDoc.toPublic();
  const accessToken = signAccessToken({ sub: publicUser.id, email: publicUser.email });
  const { token: refreshToken, expiresAt } = await createRefreshToken(publicUser.id);
  return { accessToken, refreshToken, expiresAt, user: publicUser };
}
