import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { USER_ROLES, type User, type UserRole } from '../models/users';
import { activeSessionUser } from '../services/session-access.service';
import { failReason } from '../utils/response';

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: User;
  }
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return async (req, res, next) => {
    const auth = req.auth;
    if (!auth) {
      failReason(res, 401, 'You need to be signed in to do that.', 'unauthenticated');
      return;
    }
    const user = await activeSessionUser(auth.userId, auth.sessionVersion ?? 0);
    const role = user.role ?? 'user';
    if (!roles.includes(role)) {
      failReason(res, 403, 'You do not have permission to do that.', 'forbidden');
      return;
    }
    req.auth = {
      userId: user._id.toString(),
      email: user.email,
      role,
      sessionVersion: user.sessionVersion ?? 0,
    };
    req.currentUser = user;
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void Promise.resolve(requireRole(...USER_ROLES)(req, res, next)).catch(next);
}

export const requireAdmin = requireRole('admin');
