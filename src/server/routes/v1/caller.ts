import { requireRole } from '../../middleware/requireAuth';
import { USER_ROLES, type User } from '../../models';
import { AppError } from '../../utils/AppError';

import type { Request } from 'express';

/**
 * Who is calling, on the surfaces that need an account but not a particular role.
 *
 * Extracted from `professionals.route` when the appointment routes arrived and wanted
 * the same two things. Two copies of a gate is one copy too many when what it gates
 * is "is this a real, unbanned account".
 */

/**
 * Any signed-in account, which is what "requireAuth" means here.
 *
 * Going through `requireRole` rather than `requireAuth` buys the two things these
 * surfaces need anyway: the caller is re-read from the database, so a banned account
 * cannot act on a token minted before the ban, and the handler gets the stored user
 * instead of doing a second lookup of its own.
 */
export const signedIn = requireRole(...USER_ROLES);

/**
 * The caller as the gate above just read them.
 *
 * Narrowing rather than a `!`: the gate cannot reach a handler without setting this,
 * but the type does not know that, and an assertion would hide the day somebody
 * mounts a handler outside the gate.
 */
export function actorOf(req: Request): User {
  const user = req.currentUser;
  if (!user) throw AppError.unauthorized('You need to be signed in to do that.');
  return user;
}
