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
import { findAuthIdentity, insertAuthIdentity } from '../models/auth-identities';
import { findProfessionalByUser } from '../models/professionals';
import {
  findUserByEmail,
  findUserById,
  findUserByProviderId,
  insertUser,
  toPublicUser,
  updateUser,
  type AuthProvider,
  type PublicUser,
  type User,
  type UserPatch,
} from '../models/users';
import { OAuthError, type OAuthProfile } from './oauth.service';
import { AppError } from '../utils/AppError';

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

// Resolve connected identities first; an email match requires explicit linking from Settings.
export async function findOrCreateOAuthUser(
  provider: Exclude<AuthProvider, 'local'>,
  profile: OAuthProfile,
  signup = false
): Promise<User> {
  if (typeof profile.providerId !== 'string' || !profile.providerId.trim()) {
    throw new OAuthError('The provider did not return a valid account identity.');
  }
  const identity = await findAuthIdentity(provider, profile.providerId);
  const existing = identity
    ? await findUserById(identity.user)
    : await findUserByProviderId(provider, profile.providerId);
  if (identity && !existing) throw new OAuthError('The connected account is no longer available.');
  if (existing) {
    if (signup)
      throw AppError.conflict(
        'Account already exists. Please log in.',
        `account-exists-${provider}`
      );
    if (!identity)
      await insertAuthIdentity({ user: existing._id, provider, providerId: profile.providerId });
    // A professional uses the approved name on their licence.
    const application =
      existing.role === 'professional' ? await findProfessionalByUser(existing._id) : null;
    const name =
      existing.role === 'professional'
        ? application?.status === 'verified'
          ? application.fullName
          : existing.name
        : profile.name;
    const patch: UserPatch = {};
    if (name && name !== existing.name) patch.name = name;
    if (profile.avatarUrl && profile.avatarUrl !== existing.avatarUrl) {
      patch.avatarUrl = profile.avatarUrl;
    }

    return (await updateUser(existing._id, patch)) ?? { ...existing, ...patch };
  }

  if (!profile.email) {
    throw new OAuthError(
      `${provider} does not release an email address, so an account cannot be created from it alone`,
      'signup-required'
    );
  }

  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    if (signup) throw AppError.conflict('Account already exists. Please log in.', 'account-exists');
    throw new OAuthError(
      'Sign in with your existing method, then connect your social login in Settings > Security.',
      'account-link-required'
    );
  }

  const created = await insertUser({
    email: profile.email,
    name: profile.name,
    provider,
    providerId: profile.providerId,
    avatarUrl: profile.avatarUrl,
    emailVerified: profile.emailVerified,
  });
  await insertAuthIdentity({ user: created._id, provider, providerId: profile.providerId });
  return created;
}
