import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

import { env, isProduction } from '../config/env';
import { hashToken, insertRefreshToken } from '../models/refresh-token';
import { toPublicUser, type PublicUser, type User } from '../models/users';

export type AccessTokenClaims = {
  sub: string;
  email: string;
  role: PublicUser['role'];
  sessionVersion?: number;
};

export function accessTokenClaimsFor(user: PublicUser, sessionVersion = 0): AccessTokenClaims {
  return { sub: user.id, email: user.email, role: user.role, sessionVersion };
}

export function signAccessToken(payload: AccessTokenClaims) {
  return jwt.sign(
    { ...payload, sessionVersion: payload.sessionVersion ?? 0 },
    env.JWT_SECRET_ACCESS,
    {
      expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
    }
  );
}

export async function createRefreshToken(userId: string, sessionVersion = 0) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_DAYS);

  await insertRefreshToken({ tokenHash, user: userId, expiresAt, sessionVersion });

  return { token, expiresAt };
}

export async function createAuthPayloadFor(user: User) {
  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(accessTokenClaimsFor(publicUser, user.sessionVersion ?? 0));
  const { token: refreshToken, expiresAt } = await createRefreshToken(
    publicUser.id,
    user.sessionVersion ?? 0
  );
  return { accessToken, refreshToken, expiresAt, user: publicUser };
}

export function refreshCookieOptions(expiresAt: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: expiresAt,
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, refreshCookieOptions(expiresAt));
}

export { findOrCreateOAuthUser } from './oauth-user.service';
