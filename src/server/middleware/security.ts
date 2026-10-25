import {
  ANON_CHAT_PER_IP_PER_HOUR,
  APPOINTMENT_REQUESTS_PER_IP_PER_HOUR,
  MESSAGE_SENDS_PER_IP_PER_MINUTE,
  PROFESSIONAL_INQUIRY_PER_IP_PER_HOUR,
} from '@shared/limits';
import cors from 'cors';
import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env, isTest } from '../config/env';
// Pulled in for the `req.auth` augmentation the anon limiter's skip() reads.
import './optionalAuth';
import { lambdaRateLimitStore } from './lambda-rate-limit-store';

// Allow the configured browser origin when requests bypass the local proxy.
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

// Generous ceiling — a backstop against runaway loops, not a quota.
export const generalLimiter = rateLimit({
  store: lambdaRateLimitStore('generalLimiter'),
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) =>
    isTest ||
    (req.method === 'POST' && req.originalUrl.split('?')[0] === '/api/v1/auth/introspect') ||
    (req.method === 'POST' &&
      /^\/api\/v1\/messages\/[^/]+\/messages(?:\?|$)/.test(req.originalUrl)),
});

// AI calls cost money and have upstream quotas, so they get their own cap.
export const chatLimiter = rateLimit({
  store: lambdaRateLimitStore('chatLimiter'),
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please wait a moment and try again.' },
  skip: () => isTest,
});

// Cap on the admin surface.
export const adminLimiter = rateLimit({
  store: lambdaRateLimitStore('adminLimiter'),
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please slow down.', reason: 'admin-rate-limit' },
  skip: () => isTest,
});

// Limit anonymous chat requests by network.
export const anonChatLimiter = rateLimit({
  store: lambdaRateLimitStore('anonChatLimiter'),
  windowMs: 60 * 60 * 1000,
  limit: ANON_CHAT_PER_IP_PER_HOUR,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many questions from this network. Please log in or try again later.',
    reason: 'anon-ip-limit',
  },
  // Signed-in callers are counted by chatLimiter.
  skip: (req) => isTest || Boolean(req.auth),
});

// Cap on professional enquiries, by network.
export const inquiryLimiter = rateLimit({
  store: lambdaRateLimitStore('inquiryLimiter'),
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

// Cap on appointment requests, by network.
export const bookingLimiter = rateLimit({
  store: lambdaRateLimitStore('bookingLimiter'),
  windowMs: 60 * 60 * 1000,
  limit: APPOINTMENT_REQUESTS_PER_IP_PER_HOUR,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many appointment requests from this network. Please try again later.',
    reason: 'booking-ip-limit',
  },
  skip: () => isTest,
});

// Sending a message is cheap, so this ceiling only catches a wedged client flooding a thread.
export const messageLimiter = rateLimit({
  store: lambdaRateLimitStore('messageLimiter'),
  windowMs: 60 * 1000,
  limit: MESSAGE_SENDS_PER_IP_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Please wait a moment before sending again.',
    reason: 'message-ip-limit',
  },
  skip: (req) =>
    isTest ||
    req.method !== 'POST' ||
    !/^\/api\/v1\/messages\/[^/]+\/messages(?:\?|$)/.test(req.originalUrl),
});

// Typing and message modifications stay protected without consuming the actual-send allowance.
export const messageActionLimiter = rateLimit({
  store: lambdaRateLimitStore('messageActionLimiter'),
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Please wait a moment before trying again.' },
  skip: () => isTest,
});
