import type { AccountSubscription, SubscriptionUpdate } from '@shared/subscriptions';
import type { ObjectId } from 'mongodb';
import { recordAudit } from '../models/audit-log';
import {
  findSubscription,
  setSubscription,
  type SubscriptionDocument,
} from '../models/subscriptions';
import { findUserById, type User } from '../models/users';
import { AppError } from '../utils/AppError';

export function resolveSubscription(
  stored: SubscriptionDocument | null,
  now = Date.now()
): AccountSubscription {
  if (!stored || stored.plan !== 'pro') return { plan: 'free', status: null, expiresAt: null };
  const expiry = stored.expiresAt?.getTime();
  const expiresAt =
    expiry !== undefined && Number.isFinite(expiry) ? new Date(expiry).toISOString() : null;
  if (stored.status === 'cancelled') return { plan: 'free', status: 'cancelled', expiresAt };
  if (
    stored.status !== 'active' ||
    expiry === undefined ||
    !Number.isFinite(expiry) ||
    expiry <= now
  ) {
    return { plan: 'free', status: 'expired', expiresAt };
  }
  return { plan: 'pro', status: 'active', expiresAt };
}

export async function currentSubscription(user: ObjectId, now = Date.now()) {
  return resolveSubscription(await findSubscription(user), now);
}

export async function changeSubscription(input: {
  user: ObjectId;
  update: SubscriptionUpdate;
  admin: User;
  ip: string | null;
}) {
  const target = await findUserById(input.user);
  if (!target) throw AppError.notFound('Account not found');
  const expiresAt = input.update.expiresAt ? new Date(input.update.expiresAt) : null;
  if (input.update.status === 'active' && (!expiresAt || expiresAt.getTime() <= Date.now())) {
    throw AppError.badRequest('An active Pro subscription needs a future expiry date.');
  }
  const before = await currentSubscription(target._id);
  const stored = await setSubscription(target._id, {
    plan: input.update.plan,
    status: input.update.status,
    expiresAt,
  });
  if (!stored) throw new Error('Subscription update did not return its account record.');
  const after = resolveSubscription(stored);
  await recordAudit({
    action: 'user.subscription.updated',
    targetType: 'user',
    targetId: target._id,
    actor: input.admin._id,
    actorEmail: input.admin.email,
    reason: input.update.reason ?? null,
    metadata: { from: before, to: after },
    ip: input.ip,
  });
  return after;
}
