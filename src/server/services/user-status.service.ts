import { USER_SUSPENSION_DAYS } from '@shared/limits';
import type { ObjectId } from 'mongodb';

import { recordAudit, updateUser, type UserStatus } from '../models';

export const SUSPENSION_MS = USER_SUSPENSION_DAYS * 24 * 60 * 60 * 1000;

// The parts of an account a lapsed suspension is decided from. A `Pick` would tie
// this to `User`, and the refresh route reads its owner through a join.
export type StatusState = {
  _id: ObjectId;
  email: string;
  status?: UserStatus;
  statusUntil?: Date | null;
};

export type BlockedStatus = Exclude<UserStatus, 'active'>;

// What somebody turned away at the door is told. Named rather than "not active", because
// the two are not the same news: a suspension lifts itself and a ban does not, so which
// one it is decides whether there is anything to wait for or anyone to write to.
const BLOCKED_MESSAGE: Record<BlockedStatus, string> = {
  suspended: `This account is suspended. A suspension runs ${USER_SUSPENSION_DAYS} days and then lifts on its own.`,
  banned: 'This account is banned. Write to support if you believe that is a mistake.',
};

export function blockedMessage(status: BlockedStatus): string {
  return BLOCKED_MESSAGE[status];
}

// When a suspension handed down now runs out.
export function suspensionEnd(from: Date = new Date()): Date {
  return new Date(from.getTime() + SUSPENSION_MS);
}

// The status the account actually has, lifting a suspension whose date has passed.
//
// Lifted on the way past rather than by a scheduled job: the only thing a lapsed
// suspension changes is whether this person may sign in, so the question is already
// being asked at the moment it needs answering, and a server that was switched off
// over the weekend cannot miss its turn. A ban carries no date and so never lapses.
export async function currentStatus(account: StatusState): Promise<UserStatus> {
  const status = account.status ?? 'active';
  if (status !== 'suspended') return status;
  if (!account.statusUntil || account.statusUntil.getTime() > Date.now()) return status;

  const lifted = await updateUser(account._id, {
    status: 'active',
    statusReason: null,
    statusUntil: null,
    // The lift is not an admin's doing, so the trail says so: nobody to attribute it
    // to, and the date is when the sanction ended rather than when it was handed down.
    statusChangedBy: null,
    statusChangedAt: new Date(),
  });

  await recordAudit({
    action: 'user.status.expired',
    targetType: 'user',
    targetId: account._id,
    actor: null,
    reason: `Suspension ran its ${USER_SUSPENSION_DAYS} days.`,
    metadata: { email: account.email, statusFrom: 'suspended', statusTo: 'active' },
  });

  return lifted ? lifted.status ?? 'active' : 'active';
}
