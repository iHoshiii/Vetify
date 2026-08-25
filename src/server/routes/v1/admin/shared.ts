import type { Request } from 'express';

import type { User } from '../../../models';
import { AppError } from '../../../utils/AppError';

/**
 * The admin as `requireAdmin` just read them from the database.
 *
 * Narrowing rather than a `!`: the gate cannot reach a handler without setting
 * this, but the type does not know that, and an assertion would hide the day
 * somebody mounts a handler outside the gate. Every audit entry on this surface
 * needs the actor's id and email, so this is the one thing every handler wants.
 */
export function adminOf(req: Request): User {
  const user = req.currentUser;
  if (!user) throw AppError.unauthorized('You need to be signed in to do that.');
  return user;
}

/**
 * The caller's address for the audit trail, or null when there is nothing
 * trustworthy to record.
 *
 * `app.set('trust proxy', 1)` is already on, so this is the client rather than
 * the load balancer. Recorded because "who" in an audit log means the account and
 * the machine both: a compromised admin session is the case where the account
 * alone tells you nothing.
 */
export function ipOf(req: Request): string | null {
  return req.ip ?? null;
}
