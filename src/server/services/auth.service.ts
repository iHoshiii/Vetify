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
import {
  findUserByEmail,
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

/**
 * Resolves a provider profile to a user, in three steps:
 *
 *  1. Match on (provider, providerId) — the only identifier the provider
 *     guarantees is stable, so this keeps working when someone changes the email
 *     on their Google account.
 *  2. Otherwise match on a verified email and link the identity to that existing
 *     account, so signing up with a password and later clicking "Continue with
 *     Google" does not silently produce a second account.
 *  3. Otherwise create a fresh account.
 *
 * Linking demands a provider-verified address. Without that check, anyone able
 * to register a provider account claiming victim@example.com could walk into the
 * existing local account for that address.
 */
export async function findOrCreateOAuthUser(
  provider: Exclude<AuthProvider, 'local'>,
  profile: OAuthProfile
): Promise<User> {
  const existing = await findUserByProviderId(provider, profile.providerId);
  if (existing) {
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
      `${provider} does not release an email address, so an account cannot be created from it alone`
    );
  }

  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    if (!profile.emailVerified) {
      throw new OAuthError(
        `${provider} did not verify ${profile.email}, which already belongs to an account. ` +
          'Log in with your password instead.'
      );
    }

    const patch: UserPatch = {
      provider,
      providerId: profile.providerId,
      emailVerified: true,
    };
    if (!byEmail.name && profile.name) patch.name = profile.name;
    if (!byEmail.avatarUrl && profile.avatarUrl) patch.avatarUrl = profile.avatarUrl;

    // The fallback only fires if the account was deleted between the read and
    // the write; merging the patch keeps the returned user consistent with what
    // was attempted rather than handing back the pre-link provider.
    return (await updateUser(byEmail._id, patch)) ?? { ...byEmail, ...patch };
  }

  return insertUser({
    email: profile.email,
    name: profile.name,
    provider,
    providerId: profile.providerId,
    avatarUrl: profile.avatarUrl,
    emailVerified: profile.emailVerified,
  });
}
