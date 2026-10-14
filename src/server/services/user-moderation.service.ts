import type { ObjectId } from 'mongodb';

import {
  findUserById,
  recordAudit,
  revokeAllRefreshTokensForUser,
  type User,
  type UserRole,
  type UserStatus,
} from '../models';
import { AppError } from '../utils/AppError';
import { disconnectUserSessions } from '../realtime/hub';
import { saveAccountChange } from '../models/users/account-change';
import { suspensionEnd } from './user-status.service';

export type ModerateUserInput<T> = {
  id: string | ObjectId;
  moderator: User;
  to: T;
  reason?: string | null;
  ip?: string | null;
};

export type ModerateUserResult<T> = {
  user: User;
  from: T;
  to: T;
  sessionsRevoked: number;
};

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

  const user = await saveAccountChange(target._id, { role: to });
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

  const user = await saveAccountChange(
    target._id,
    {
      status: to,
      // Cleared on reinstatement: leaving the note behind would describe an account
      // that is no longer under any sanction. The audit log keeps the history.
      statusReason: to === 'active' ? null : reason,
      statusChangedBy: moderator._id,
      statusChangedAt: new Date(),
      statusUntil: to === 'suspended' ? suspensionEnd() : null,
    },
    to !== 'active'
  );
  if (!user) return null;

  if (to !== 'active') disconnectUserSessions(target._id.toString(), user.sessionVersion ?? 0);
  const sessionsRevoked =
    to === 'active' ? 0 : await revokeAllRefreshTokensForUser(target._id, user.sessionVersion ?? 0);

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
