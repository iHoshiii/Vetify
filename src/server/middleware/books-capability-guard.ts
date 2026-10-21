import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const booksCapabilityGuard: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const digest = env.BOOKS_CAPABILITY_TOKEN_SHA256;
  const expiry = env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT;
  if (!digest || !expiry) {
    throw new AppError(503, 'Books professional verification is not configured.');
  }
  const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  if (
    !bearer ||
    Date.parse(expiry) <= Date.now() ||
    !timingSafeEqual(createHash('sha256').update(bearer[1]).digest(), Buffer.from(digest, 'hex'))
  ) {
    throw AppError.unauthorized('Invalid or expired Books service credential.');
  }
  next();
};
