import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { findUserById, isValidObjectId, type User, type UserRole } from '../models';
import { blockedMessage, currentStatus } from '../services/user-status.service';
import { failReason } from '../utils/response';

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * The caller as stored right now, attached by `requireRole` after its
     * database read. Handlers behind that gate use it instead of fetching the
     * same document again — audit entries need the actor's email, and the
     * self-action guards need the actor's id and role.
     */
    currentUser?: User;
  }
}

/**
 * Rejects a request that arrived without a usable access token.
 *
 * Must be mounted after `optionalAuth`, which is the middleware that actually
 * verifies the signature. This one only reads the annotation optionalAuth left
 * behind, so on its own it would turn every request away.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    failReason(res, 401, 'You need to be signed in to do that.', 'unauthenticated');
    return;
  }

  next();
}

/**
 * Gate for routes that only some roles may reach.
 *
 * Deliberately re-reads the user rather than trusting the token's role claim.
 * Access tokens live ACCESS_TOKEN_MINUTES, so a token-only check would leave a
 * just-demoted admin holding full powers until it expired — the one window an
 * attacker with a stolen admin token would most like to have. The read also
 * catches a suspension or ban in the same pass, and costs one indexed `_id`
 * lookup.
 *
 * 401 when nobody is signed in, 403 when someone is but is not allowed. Those
 * are different failures for the client: the first is fixed by logging in, the
 * second never is.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return async (req, res, next) => {
    const auth = req.auth;
    if (!auth) {
      failReason(res, 401, 'You need to be signed in to do that.', 'unauthenticated');
      return;
    }

    // A malformed subject would otherwise throw a BSONError out of findUserById
    // and surface as a 400 from the error handler, which reads like the caller
    // sent a bad id when what they actually sent was a bad token.
    if (!isValidObjectId(auth.userId)) {
      failReason(res, 401, 'Your session is no longer valid. Please sign in again.', 'bad-subject');
      return;
    }

    const user = await findUserById(auth.userId);
    if (!user) {
      // Token still verifies, but the account behind it is gone.
      failReason(res, 401, 'Your session is no longer valid. Please sign in again.', 'no-account');
      return;
    }

    // Read through the lift, so a suspension that ran out overnight stops applying
    // without an admin having to come back and undo it.
    const status = await currentStatus(user);
    if (status !== 'active') {
      failReason(res, 403, blockedMessage(status), `account-${status}`);
      return;
    }

    const role = user.role ?? 'user';
    if (!roles.includes(role)) {
      failReason(res, 403, 'You do not have permission to do that.', 'forbidden');
      return;
    }

    // Keep the request's view of the caller in step with what was just read, so
    // a handler cannot act on a stale role claim from the token.
    req.auth = { userId: user._id.toString(), email: user.email, role };
    req.currentUser = user;

    next();
  };
}

/** Convenience for the admin surface, which is the only caller so far. */
export const requireAdmin = requireRole('admin');
