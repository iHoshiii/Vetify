import { ANON_COOKIE_DAYS } from '@shared/limits';
import type { CookieOptions, Request, Response } from 'express';
import crypto from 'node:crypto';
import { isProduction } from '../../config/env';
import { sealAnonId, unsealAnonId } from './anon-crypto';

export const ANON_ID_COOKIE = 'vetify_anon';

export const anonCookieOptions: CookieOptions = {
  httpOnly: true, // block JS access to cookie to avoid injections (xss)
  secure: isProduction, // only send this cookie back to the server if the connection is already HTTPS.
  sameSite: 'lax', // protection of CSPF
  maxAge: ANON_COOKIE_DAYS * 24 * 60 * 60 * 1000, // remember the visitor for 1 year
  path: '/',
};

// ensures that the anonID is existing
// anonID should be string
export function ensureAnonId(req: Request, res: Response): string {
  const jar = req.cookies as Record<string, string> | undefined;
  const existing = unsealAnonId(jar?.[ANON_ID_COOKIE]);
  if (existing) return existing;

  // genarates 16 characters of random bytes and convert it to base64url (A-Z, a-z, 0-9, -, _) string
  const id = crypto.randomBytes(16).toString('base64url');

  // throws the cookie to the client with the anonID and the options defined above
  res.cookie(ANON_ID_COOKIE, sealAnonId(id), anonCookieOptions);

  return id;
}
