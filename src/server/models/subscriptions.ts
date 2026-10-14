import type { SubscriptionPlan, SubscriptionStatus } from '@shared/subscriptions';
import { ObjectId, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db';

export const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
export const SUBSCRIPTION_INDEXES: IndexDescription[] = [{ key: { user: 1 }, unique: true }];

export type SubscriptionDocument = {
  _id: ObjectId;
  user: ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
export type SubscriptionFields = Pick<SubscriptionDocument, 'plan' | 'status' | 'expiresAt'>;
export const subscriptionsCollection = () =>
  getDb().collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION);

export function findSubscription(user: ObjectId) {
  return subscriptionsCollection().findOne({ user });
}

export async function setSubscription(user: ObjectId, input: SubscriptionFields) {
  const now = new Date();
  return subscriptionsCollection().findOneAndUpdate(
    { user },
    {
      $set: { plan: input.plan, status: input.status, expiresAt: input.expiresAt, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), user, createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );
}
