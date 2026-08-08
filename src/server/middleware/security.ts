import cors from 'cors';
import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env, isTest } from '../config/env';

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
