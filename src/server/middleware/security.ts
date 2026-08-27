import { ANON_CHAT_PER_IP_PER_HOUR, PROFESSIONAL_INQUIRY_PER_IP_PER_HOUR } from '@shared/limits';
import cors from 'cors';
import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env, isTest } from '../config/env';
// Pulled in for the `req.auth` augmentation the anon limiter's skip() reads.
import './optionalAuth';

/**
 * CORS matters only for clients that bypass the Vite dev proxy (staging, native
 * apps, curl with cookies). `credentials: true` requires an explicit origin —
 * the wildcard is rejected outright by browsers when credentials are in play.
 */
export function applySecurity(app: Express): void {
  app.disable('x-powered-by');

  app.use(helmet());

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
}

/** Generous ceiling — a backstop against runaway loops, not a quota. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
});

/** Gemini calls cost money and have upstream quotas, so they get their own cap. */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please wait a moment and try again.' },
  skip: () => isTest,
});

/**
 * Cap on the admin surface.
 *
 * Tighter than the general limiter because these are the destructive endpoints:
 * a script driving takedowns or role changes in a loop is either a mistake or an
 * attack, and neither has a legitimate reason to move faster than a person
 * clicking. Well above what a dashboard session generates, since one page load
 * fans out into several metrics reads.
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please slow down.', reason: 'admin-rate-limit' },
  skip: () => isTest,
});

/**
 * Abuse ceiling for chat from callers with no account, on top of the per-visitor
 * cookie allowance. Set well above FREE_ANON_QUERIES on purpose: the cookie is
 * the per-person rule, and matching the two here would mean one person's five
 * questions locked out everyone else behind the same NAT.
 *
 * Also the only thing standing in for the cookie counter when Mongo is down,
 * since the quota check fails open in that case.
 */
export const anonChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: ANON_CHAT_PER_IP_PER_HOUR,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many questions from this network. Please log in or try again later.',
    reason: 'anon-ip-limit',
  },
  // Signed-in callers are counted by chatLimiter alone; this layer is only for
  // traffic we cannot attribute to an account.
  skip: (req) => isTest || Boolean(req.auth),
});

/**
 * Cap on professional enquiries, by network.
 *
 * An account is needed to write in, but an account is free, so this is still the
 * one write where a single machine can fill a reviewer's queue. Per hour rather
 * minute because the honest pattern is one enquiry ever and a retry or two after a
 * typo, and an hour-long window catches a script that a sixty-second one would
 * merely pace.
 *
 * The `openEmail` index already limits one address to one open enquiry; this
 * limits one network to a handful of addresses.
 */
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: PROFESSIONAL_INQUIRY_PER_IP_PER_HOUR,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many enquiries from this network. Please try again later.',
    reason: 'inquiry-ip-limit',
  },
  skip: () => isTest,
});
