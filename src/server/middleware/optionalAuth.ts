import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export type RequestAuth = { userId: string; email: string };

declare module 'express-serve-static-core' {
  interface Request {
    auth?: RequestAuth;
  }
}

/**
 * Annotates the request with the caller's identity when a valid Bearer token is
 * present, and does nothing otherwise.
 *
 * Never rejects, by design. Routes that require a user check `req.auth`
 * themselves; routes that merely behave differently for signed-in callers — the
 * chat quota — read it and carry on. An expired token is treated as anonymous
 * rather than as an error, because the client refreshes on its own schedule and
 * a hard 401 here would break chat for someone mid-conversation.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.slice('Bearer '.length).trim();
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET_ACCESS) as { sub?: string; email?: string };
    if (payload.sub) req.auth = { userId: payload.sub, email: payload.email ?? '' };
  } catch {
    // Forged, expired, or signed with a rotated secret: stay anonymous.
  }

  next();
}
