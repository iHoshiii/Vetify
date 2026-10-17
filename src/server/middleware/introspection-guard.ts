import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { lambdaRateLimitStore } from './lambda-rate-limit-store';
import jwt from 'jsonwebtoken';
import { env, isTest } from '../config/env';
import { isValidObjectId } from '../models/object-id';
import { fail } from '../utils/response';

type IntrospectionClaims = jwt.JwtPayload & { sub: string; exp: number };
declare module 'express-serve-static-core' {
  interface Request {
    introspectionClaims?: IntrospectionClaims;
  }
}

export function createIntrospectionGuard(limit = 300, invalidLimit = 50): RequestHandler {
  const common = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    skip: () => isTest,
  };
  const accountLimiter = rateLimit({
    store: lambdaRateLimitStore('accountLimiter'),
    ...common,
    limit,
    keyGenerator: (req) => req.introspectionClaims!.sub,
    message: {
      error: 'Too many account checks. Please retry later.',
      reason: 'introspection-rate-limit',
    },
  });
  const invalidLimiter = rateLimit({
    store: lambdaRateLimitStore('invalidLimiter'),
    ...common,
    limit: invalidLimit,
    message: {
      error: 'Too many invalid account checks. Please retry later.',
      reason: 'invalid-introspection-rate-limit',
    },
  });

  return (req, res, next) => {
    let claims: IntrospectionClaims | null = null;
    try {
      const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
      if (bearer) {
        const decoded = jwt.verify(bearer[1], env.JWT_SECRET_ACCESS, { algorithms: ['HS256'] });
        if (
          typeof decoded !== 'string' &&
          typeof decoded.sub === 'string' &&
          isValidObjectId(decoded.sub) &&
          typeof decoded.exp === 'number'
        ) {
          claims = decoded as IntrospectionClaims;
        }
      }
    } catch {
      claims = null;
    }
    if (!claims) {
      invalidLimiter(req, res, (error) => {
        if (error) return next(error);
        fail(res, 401, 'Invalid or expired access token.');
      });
      return;
    }
    req.introspectionClaims = claims;
    accountLimiter(req, res, next);
  };
}

export const introspectionGuard = createIntrospectionGuard();
