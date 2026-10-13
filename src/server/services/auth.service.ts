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

/**
 * What every access token carries. Named so the two places that mint one — login
 * and refresh — cannot drift apart and leave a token without its role claim.
 *
 * The role here is a hint for the client UI. Authorization reads the stored role
 * instead, because this claim is frozen for the life of the token.
 */
export type AccessTokenClaims = {
  sub: string;
  email: string;
  role: PublicUser['role'];
};

export function accessTokenClaimsFor(user: PublicUser): AccessTokenClaims {
  return { sub: user.id, email: user.email, role: user.role };
}

export function signAccessToken(payload: AccessTokenClaims) {
  return jwt.sign(payload, env.JWT_SECRET_ACCESS, {
    expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
  });
}

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_DAYS);

  await insertRefreshToken({ tokenHash, user: userId, expiresAt });

  return { token, expiresAt };
}

export async function createAuthPayloadFor(user: User) {
  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(accessTokenClaimsFor(publicUser));
  const { token: refreshToken, expiresAt } = await createRefreshToken(publicUser.id);
  return { accessToken, refreshToken, expiresAt, user: publicUser };
}

/** Single definition of the refresh cookie, so the flags cannot drift per route. */
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
  profile: OAuthProfile
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
    if (!identity)
      await insertAuthIdentity({ user: existing._id, provider, providerId: profile.providerId });
    // Let a changed display name or avatar follow the provider. Collecting the
    // changes into a patch and letting an empty one skip the write is what
    // `doc.isModified()` used to decide.
    const patch: UserPatch = {};
    if (profile.name && profile.name !== existing.name) patch.name = profile.name;
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
