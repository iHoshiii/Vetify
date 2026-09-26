import rateLimit from 'express-rate-limit';

import { isTest } from '../config/env';

// Credential surface: brute-forcing a password or spraying signups is the abuse this stops, and refresh is capped too so a stolen cookie cannot be replayed in a tight loop. Set well above one person's logins plus periodic token refreshes.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many attempts. Please wait a few minutes and try again.',
    reason: 'auth-rate-limit',
  },
  skip: () => isTest,
});
