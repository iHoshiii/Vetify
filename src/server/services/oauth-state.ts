import crypto from 'node:crypto';
import type { CookieOptions } from 'express';

import { env, isProduction } from '../config/env';
import type { OAuthProviderName } from './oauth.service';

export const OAUTH_STATE_COOKIE = 'vetify_oauth_state';

/** Long enough for a slow consent screen, short enough to bound replay. */
const STATE_TTL_MS = 10 * 60 * 1000;

export type OAuthStatePayload = {
  provider: OAuthProviderName;
  state: string;
  codeVerifier: string;
  expiresAt: number;
};

// Falls back to the access-token secret so a missing OAUTH_STATE_SECRET degrades
// to "still signed with something strong" rather than to unsigned state.
function stateSecret(): string {
  return env.OAUTH_STATE_SECRET ?? env.JWT_SECRET_ACCESS;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', stateSecret()).update(data).digest('base64url');
}

/**
 * Cookie carrying the PKCE verifier across the provider round trip. SameSite
 * must stay Lax: the provider returns the browser here by top-level navigation,
 * and Strict would withhold the cookie on exactly that request, breaking every
 * callback with a state mismatch.
 */
export const stateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: STATE_TTL_MS,
  path: '/api/v1/auth',
};

export function sealState(
  provider: OAuthProviderName,
  state: string,
  codeVerifier: string
): string {
  const payload: OAuthStatePayload = {
    provider,
    state,
    codeVerifier,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Returns null for anything not exactly right: tampered signature, wrong shape,
 * or expired. Callers treat null as "restart the flow", never as "proceed".
 */
export function unsealState(raw: unknown): OAuthStatePayload | null {
  if (typeof raw !== 'string') return null;

  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;

  const encoded = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = sign(encoded);

  // Equal-length check first: timingSafeEqual throws on a length mismatch.
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const payload = parsed as Partial<OAuthStatePayload>;
  if (
    typeof payload.provider !== 'string' ||
    typeof payload.state !== 'string' ||
    typeof payload.codeVerifier !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    return null;
  }
  if (payload.expiresAt < Date.now()) return null;

  return payload as OAuthStatePayload;
}

/** Constant-time compare for the state echoed back by the provider. */
export function statesMatch(fromCookie: string, fromQuery: unknown): boolean {
  if (typeof fromQuery !== 'string' || fromQuery.length !== fromCookie.length) return false;
  return crypto.timingSafeEqual(Buffer.from(fromCookie), Buffer.from(fromQuery));
}
