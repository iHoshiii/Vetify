import { NOTIFICATION_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { notificationAttrsSchema, type NotificationAttrs } from './schema';
import { NOTIFICATIONS_COLLECTION, type NotificationDocument } from './types';

export function notificationsCollection(): Collection<NotificationDocument> {
  return getDb().collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
}

// Records one notification, unread.
export async function insertNotification(attrs: NotificationAttrs): Promise<NotificationDocument> {
  const parsed = notificationAttrsSchema.parse(attrs);

  const doc: NotificationDocument = {
    _id: new ObjectId(),
    user: toObjectId(parsed.user),
    kind: parsed.kind,
    appointment: toObjectId(parsed.appointment),
    // Only stored when the caller knew it, so old-shape rows stay absent rather than null.
    ...(parsed.appointmentKind ? { appointmentKind: parsed.appointmentKind } : {}),
    title: parsed.title,
    body: parsed.body,
    readAt: null,
    createdAt: new Date(),
  };

  await notificationsCollection().insertOne(doc);
  return doc;
}

// One page of an account's notifications, newest first.
export async function findNotifications(input: {
  user: string | ObjectId;
  page?: number;
  limit?: number;
}): Promise<{ items: NotificationDocument[]; total: number }> {
  const { user, page = 1, limit = NOTIFICATION_PAGE_SIZE } = input;
  const filter = { user: toObjectId(user) };

  const [items, total] = await Promise.all([
    notificationsCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    notificationsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

// How many an account has not opened, for the bell badge.
export async function countUnreadNotifications(user: string | ObjectId): Promise<number> {
  return await notificationsCollection().countDocuments({
    user: toObjectId(user),
    readAt: null,
  });
}

// Marks one read, but only when it is the caller's own. Null when it is not theirs or is gone.
export async function markNotificationRead(
  id: string | ObjectId,
  user: string | ObjectId
): Promise<NotificationDocument | null> {
  return await notificationsCollection().findOneAndUpdate(
    { _id: toObjectId(id), user: toObjectId(user) },
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' }
  );
}

// Clears an account's whole unread count in one write. Returns how many rows it moved.
export async function markAllNotificationsRead(user: string | ObjectId): Promise<number> {
  const result = await notificationsCollection().updateMany(
    { user: toObjectId(user), readAt: null },
    { $set: { readAt: new Date() } }
  );
  return result.modifiedCount;
}
