import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import type { UserRole } from '../models/users';
import { activeNativeSession } from '../models/native-session';

export type RequestAuth = {
  userId: string;
  email: string;
  /**
   * Role as it stood when the token was signed, which can be up to
   * ACCESS_TOKEN_MINUTES out of date. Fine for cheap branching; never the basis
   * for granting access. `requireRole` re-reads the stored role for that.
   */
  role: UserRole;
  sessionVersion?: number;
};

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
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.slice('Bearer '.length).trim();
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET_ACCESS) as {
      sub?: string;
      email?: string;
      role?: UserRole;
      nativeSessionId?: unknown;
    };
    if (payload.sub) {
      if (
        payload.nativeSessionId !== undefined &&
        (typeof payload.nativeSessionId !== 'string' ||
          !(await activeNativeSession(payload.nativeSessionId, payload.sub)))
      )
        return next();
      req.auth = {
        userId: payload.sub,
        email: payload.email ?? '',
        // Tokens minted before the role claim existed read as plain users.
        role: payload.role ?? 'user',
        sessionVersion: payload.sessionVersion ?? 0,
      };
    }
  } catch {
    // Forged, expired, or signed with a rotated secret: stay anonymous.
  }

  next();
}
