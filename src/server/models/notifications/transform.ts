import type { NotificationDocument, NotificationPage, NotificationView } from './types';

export function toNotificationView(notification: NotificationDocument): NotificationView {
  return {
    id: notification._id.toString(),
    kind: notification.kind,
    appointmentId: notification.appointment.toString(),
    title: notification.title,
    body: notification.body,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toNotificationPage(input: {
  items: NotificationDocument[];
  total: number;
  page: number;
  limit: number;
}): NotificationPage {
  const { items, total, page, limit } = input;

  return {
    items: items.map(toNotificationView),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
