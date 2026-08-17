import { ANON_COOKIE_DAYS, FREE_ANON_QUERIES } from '@shared/limits';
import type { CookieOptions, Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

import { env, isProduction } from '../config/env';
import { ANON_QUOTA_WINDOW_MS, AnonUsage } from '../models/AnonUsage';

export const ANON_ID_COOKIE = 'vetify_anon';

/**
 * Outlives the allowance window by a wide margin on purpose. This cookie is only
 * the visitor's identity; the usage record is what expires and resets their
 * questions. Tying the cookie's life to the window would hand the reset to the
 * browser instead of the server.
 */
export const anonCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: ANON_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
};

function anonSecret(): string {
  return env.OAUTH_STATE_SECRET ?? env.JWT_SECRET_ACCESS;
}

function sign(id: string): string {
  return crypto.createHmac('sha256', anonSecret()).update(id).digest('base64url');
}

/** `<id>.<hmac>` — signed so a visitor cannot claim someone else's fresh count. */
function seal(id: string): string {
  return `${id}.${sign(id)}`;
}

function unseal(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;

  const id = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = sign(id);

  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  return id;
}

/**
 * Returns the caller's anonymous id, minting and setting one when the cookie is
 * absent or fails verification. Tampering is treated as a first visit rather
 * than an error — there is nothing to gain by it beyond the five questions a new
 * visitor would get anyway.
 */
export function ensureAnonId(req: Request, res: Response): string {
  const jar = req.cookies as Record<string, string> | undefined;
  const existing = unseal(jar?.[ANON_ID_COOKIE]);
  if (existing) return existing;

  const id = crypto.randomBytes(16).toString('base64url');
  res.cookie(ANON_ID_COOKIE, seal(id), anonCookieOptions);
  return id;
}

export type QuotaVerdict = {
  allowed: boolean;
  used: number;
  remaining: number;
};

let warnedAboutMissingDb = false;

/**
 * Spends one question against `anonId` and reports whether it was within the
 * allowance.
 *
 * Increment-then-check, in a single atomic findOneAndUpdate, so two requests
 * racing cannot both read four and both be allowed through.
 *
 * Fails OPEN when Mongo is unreachable. The chat endpoint has always been
 * usable without a database — see the comment in config/db.ts — and turning a
 * degraded database into "nobody can ask anything" would be a worse outcome than
 * a few uncounted questions. The per-IP limiter is what covers this gap, which
 * is the reason both layers exist.
 */
export async function consumeAnonQuery(anonId: string): Promise<QuotaVerdict> {
  if (mongoose.connection.readyState !== 1) {
    if (!warnedAboutMissingDb) {
      warnedAboutMissingDb = true;
      console.warn(
        '[quota] no database connection; anonymous chat allowance is not being counted. ' +
          'The per-IP limiter is the only ceiling until Mongo is back.'
      );
    }
    return { allowed: true, used: 0, remaining: FREE_ANON_QUERIES };
  }

  const doc = await AnonUsage.findOneAndUpdate(
    { anonId },
    {
      $inc: { chatCount: 1 },
      // setOnInsert, not set: the window runs from the first question, so it
      // still closes on schedule for someone who keeps retrying after being
      // refused. Refreshing this on every hit would make the allowance
      // unreachable rather than daily.
      $setOnInsert: { expiresAt: new Date(Date.now() + ANON_QUOTA_WINDOW_MS) },
    },
    { new: true, upsert: true }
  );

  const used = doc.chatCount;
  return {
    allowed: used <= FREE_ANON_QUERIES,
    used,
    remaining: Math.max(0, FREE_ANON_QUERIES - used),
  };
}

/** Reads the count without spending one. */
export async function peekAnonUsage(anonId: string): Promise<number> {
  if (mongoose.connection.readyState !== 1) return 0;
  const doc = await AnonUsage.findOne({ anonId }).select('chatCount');
  return doc?.chatCount ?? 0;
}
