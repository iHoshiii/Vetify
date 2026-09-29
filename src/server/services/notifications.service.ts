import type { ObjectId } from 'mongodb';

import type { AppointmentKind } from '@shared/schemas';
import {
  countUnreadNotifications,
  findNotifications,
  getPreferences,
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
  appointmentKind?: AppointmentKind;
  title: string;
  body: string;
};

const CATEGORY_BY_KIND: Record<NotificationKind, 'bookings' | 'reminders' | 'reviews'> = {
  booking_requested: 'bookings',
  booking_confirmed: 'bookings',
  booking_declined: 'bookings',
  booking_reminder: 'reminders',
  review_request: 'reviews',
  appointment_rated: 'reviews',
};

function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function timeMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isQuietTime(now: Date, timeZone: string, start: string, end: string): boolean {
  const current = localMinutes(now, timeZone);
  const from = timeMinutes(start);
  const to = timeMinutes(end);
  if (from === to) return false;
  return from < to ? current >= from && current < to : current >= from || current < to;
}

// Records a notification and nudges the recipient's open tabs to refetch. The emit is a no-op before the socket server is up.
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationView | null> {
  const preferences = await getPreferences(input.user);
  const notifications = preferences?.notifications;
  if (!notifications?.enabled || !notifications.categories[CATEGORY_BY_KIND[input.kind]]) {
    return null;
  }

  const doc = await insertNotification(input);
  const quiet =
    notifications.dnd.enabled &&
    isQuietTime(
      new Date(),
      preferences.region.timeZone,
      notifications.dnd.start,
      notifications.dnd.end
    );
  if (!quiet) emitToUser(doc.user.toString(), 'notification:new', { id: doc._id.toString() });
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
