import { ObjectId, type IndexDescription } from 'mongodb';

import type { AppointmentKind } from '@shared/schemas';

export const NOTIFICATIONS_COLLECTION = 'notifications';

// The booking events an in-app notification can announce. One list, so the client and server agree.
export const NOTIFICATION_KINDS = [
  'booking_requested',
  'booking_confirmed',
  'booking_declined',
  'booking_reminder',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// One thing that happened, addressed to one account and kept for its feed.
export type NotificationDocument = {
  _id: ObjectId;
  // The recipient's account id, the axis every query filters on.
  user: ObjectId;
  kind: NotificationKind;
  // The booking it is about, so a click can route straight to it.
  appointment: ObjectId;
  // The booking's kind, so a click routes to the right console queue. Absent on rows made before the field.
  appointmentKind?: AppointmentKind;
  title: string;
  body: string;
  // Null until the account opens it; the unread count is the rows still null here.
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  appointmentId: string;
  appointmentKind?: AppointmentKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationView[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export const NOTIFICATION_INDEXES: IndexDescription[] = [
  // The feed: one account's notifications, newest first.
  { key: { user: 1, createdAt: -1 } },
  // The unread count and mark-all: an account's rows split by read state.
  { key: { user: 1, readAt: 1 } },
];
