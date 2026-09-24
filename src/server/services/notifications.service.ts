import type { ObjectId } from 'mongodb';

import {
  countUnreadNotifications,
  findNotifications,
  insertNotification,
  markAllNotificationsRead,
  markNotificationRead,
  toNotificationPage,
  toNotificationView,
  type NotificationKind,
  type NotificationPage,
  type NotificationView,
} from '../models';
import { emitToUser } from '../realtime/hub';

export type CreateNotificationInput = {
  user: string | ObjectId;
  kind: NotificationKind;
  appointment: string | ObjectId;
  title: string;
  body: string;
};

// Records a notification and nudges the recipient's open tabs to refetch. The emit is a no-op before the socket server is up.
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationView> {
  const doc = await insertNotification(input);
  emitToUser(doc.user.toString(), 'notification:new', { id: doc._id.toString() });
  return toNotificationView(doc);
}

export async function listForUser(input: {
  user: string | ObjectId;
  page: number;
  limit: number;
}): Promise<NotificationPage> {
  const { items, total } = await findNotifications(input);
  return toNotificationPage({ items, total, page: input.page, limit: input.limit });
}

export async function countUnread(user: string | ObjectId): Promise<number> {
  return await countUnreadNotifications(user);
}

// Marks one read for its owner. Null when it is not theirs or does not exist, so the route answers 404.
export async function markRead(
  id: string | ObjectId,
  user: string | ObjectId
): Promise<NotificationView | null> {
  const doc = await markNotificationRead(id, user);
  return doc ? toNotificationView(doc) : null;
}

export async function markAllRead(user: string | ObjectId): Promise<number> {
  return await markAllNotificationsRead(user);
}
