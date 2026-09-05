import type { ObjectId } from 'mongodb';

import {
  countActiveAdmins,
  findUserById,
  recordAudit,
  revokeAllRefreshTokensForUser,
  updateUser,
  type User,
  type UserRole,
  type UserStatus,
} from '../models';
import { AppError } from '../utils/AppError';
import { suspensionEnd } from './user-status.service';

export type ModerateUserInput<T> = {
  id: string | ObjectId;
  /** The admin acting, as `requireAdmin` read them. */
  moderator: User;
  to: T;
  reason?: string | null;
  ip?: string | null;
};

export type ModerateUserResult<T> = {
  user: User;
  from: T;
  to: T;
  /** Sessions closed by this change. Zero for anything but a suspension or a ban. */
  sessionsRevoked: number;
};

/**
 * Refuses a change that would leave nobody able to sign in as an admin.
 *
 * Recovering from that needs a database shell, which is not a thing an admin
 * locked out of their own dashboard on a Sunday is going to enjoy discovering.
 * Counted rather than assumed, and counted only when the change actually removes
 * the target from the set — promoting an admin to admin is not a threat.
 *
 * Over the HTTP routes this is a backstop rather than the first line: the acting
 * admin is themselves an active admin and cannot action their own account, so a
 * second active admin always exists there. It earns its place for the callers
 * that are not those routes — a script, or a future automation — and for the day
 * the self-action rule is relaxed.
 */
async function assertNotLastAdmin(target: User, stillActiveAdmin: boolean): Promise<void> {
  const wasActiveAdmin =
    (target.role ?? 'user') === 'admin' && (target.status ?? 'active') === 'active';
  if (!wasActiveAdmin || stillActiveAdmin) return;

  const admins = await countActiveAdmins();
  if (admins <= 1) {
    throw AppError.conflict(
      'That is the last active admin. Promote someone else first.',
      'last-admin'
    );
  }
}

/**
 * Promotes or demotes an account.
 *
 * Self-changes are refused outright rather than guarded case by case: an admin
 * who can rewrite their own role is one typo away from locking themselves out,
 * and there is no legitimate use for it that a second admin cannot serve. The
 * same reasoning covers the last-admin check below.
 *
 * Returns null for an account that does not exist, so the caller answers 404.
 */
export async function changeUserRole(
  input: ModerateUserInput<UserRole>
): Promise<ModerateUserResult<UserRole> | null> {
  const { id, moderator, to, reason = null, ip = null } = input;

  const target = await findUserById(id);
  if (!target) return null;

  if (target._id.equals(moderator._id)) {
    throw AppError.conflict('You cannot change your own role.', 'self-role-change');
  }

  const from = target.role ?? 'user';
  if (from === to) {
    throw AppError.conflict(`That account is already ${to}.`, `already-${to}`);
  }

  await assertNotLastAdmin(target, to === 'admin');

  const user = await updateUser(target._id, { role: to });
  if (!user) return null;

  await recordAudit({
    action: 'user.role.changed',
    targetType: 'user',
    targetId: target._id,
    actor: moderator._id,
    actorEmail: moderator.email,
    reason,
    metadata: { email: target.email, roleFrom: from, roleTo: to },
    ip,
  });

  return { user, from, to, sessionsRevoked: 0 };
}

/**
 * Suspends, bans, or reinstates an account.
 *
 * A suspension is a ban with a date on it and a ban is a suspension without one,
 * which is the only difference between them: `currentStatus` reinstates the account
 * the first time it is asked about after that date.
 *
 * Taking access away also closes the open sessions. `requireRole` catches the
 * status on the next request, but the refresh cookie outlives the access token by
 * a month — without revoking it the banned account just mints a new token and
 * carries on, which is a ban in name only.
 */
export async function changeUserStatus(
  input: ModerateUserInput<UserStatus>
): Promise<ModerateUserResult<UserStatus> | null> {
  const { id, moderator, to, reason = null, ip = null } = input;

  const target = await findUserById(id);
  if (!target) return null;

  if (target._id.equals(moderator._id)) {
    throw AppError.conflict('You cannot change your own status.', 'self-status-change');
  }

  // Required by the schema as well. Repeated because this is the record that has
  // to explain the decision months later, whichever caller made it.
  if (to !== 'active' && !reason?.trim()) {
    throw AppError.badRequest(
      'A reason is required to suspend or ban an account.',
      'reason-required'
    );
  }

  const from = target.status ?? 'active';
  if (from === to) {
    throw AppError.conflict(`That account is already ${to}.`, `already-${to}`);
  }

  await assertNotLastAdmin(target, to === 'active');

  const user = await updateUser(target._id, {
    status: to,
    // Cleared on reinstatement: leaving the note behind would describe an account
    // that is no longer under any sanction. The audit log keeps the history.
    statusReason: to === 'active' ? null : reason,
    statusChangedBy: moderator._id,
    statusChangedAt: new Date(),
    statusUntil: to === 'suspended' ? suspensionEnd() : null,
  });
  if (!user) return null;

  const sessionsRevoked = to === 'active' ? 0 : await revokeAllRefreshTokensForUser(target._id);

  await recordAudit({
    action: 'user.status.changed',
    targetType: 'user',
    targetId: target._id,
    actor: moderator._id,
    actorEmail: moderator.email,
    reason,
    metadata: { email: target.email, statusFrom: from, statusTo: to, sessionsRevoked },
    ip,
  });

  return { user, from, to, sessionsRevoked };
}
