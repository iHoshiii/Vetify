import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

import { env, isProduction } from '../config/env';
import { RefreshToken, hashToken } from '../models/RefreshToken';
import { User, type AuthProvider, type UserDoc } from '../models/User';
import { OAuthError, type OAuthProfile } from './oauth.service';

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
): Promise<UserDoc> {
  const existing = await User.findOne({ provider, providerId: profile.providerId });
  if (existing) {
    // Let a changed display name or avatar follow the provider.
    if (profile.name && profile.name !== existing.name) existing.name = profile.name;
    if (profile.avatarUrl && profile.avatarUrl !== existing.avatarUrl) {
      existing.avatarUrl = profile.avatarUrl;
    }
    if (existing.isModified()) await existing.save();
    return existing;
  }

  if (!profile.email) {
    throw new OAuthError(
      `${provider} does not release an email address, so an account cannot be created from it alone`
    );
  }

  const byEmail = await User.findOne({ email: profile.email });
  if (byEmail) {
    if (!profile.emailVerified) {
      throw new OAuthError(
        `${provider} did not verify ${profile.email}, which already belongs to an account. ` +
          'Log in with your password instead.'
      );
    }
    byEmail.provider = provider;
    byEmail.providerId = profile.providerId;
    byEmail.emailVerified = true;
    if (!byEmail.name && profile.name) byEmail.name = profile.name;
    if (!byEmail.avatarUrl && profile.avatarUrl) byEmail.avatarUrl = profile.avatarUrl;
    await byEmail.save();
    return byEmail;
  }

  return User.create({
    email: profile.email,
    name: profile.name,
    provider,
    providerId: profile.providerId,
    avatarUrl: profile.avatarUrl,
    emailVerified: profile.emailVerified,
  });
}
