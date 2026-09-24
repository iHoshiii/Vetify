import type { AppointmentKind } from '@shared/schemas';

import { apiFetch } from './api';

// Mirrors the server's NotificationKind so the panel can pick copy and a route per event.
export type NotificationKind =
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_reminder';

// One notification as the recipient reads it, matching the server's NotificationView.
export type Notification = {
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
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type PageParams = { page?: number; limit?: number };

function queryOf(params: PageParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : '';
}

// GET /api/v1/notifications — one page of the caller's feed, newest first.
export async function listNotifications(params: PageParams = {}, signal?: AbortSignal) {
  return await apiFetch<NotificationPage>(`/notifications${queryOf(params)}`, { signal });
}

// GET /api/v1/notifications/unread — the caller's unread total, for the bell badge.
export async function getUnreadNotifications(signal?: AbortSignal) {
  const { unread } = await apiFetch<{ unread: number }>('/notifications/unread', { signal });
  return unread;
}

// PATCH /api/v1/notifications/:id/read — mark one read for the caller.
export async function markNotificationRead(id: string) {
  const { notification } = await apiFetch<{ notification: Notification }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' }
  );
  return notification;
}

// PATCH /api/v1/notifications/read-all — clear the whole unread count, returning how many moved.
export async function markAllNotificationsRead() {
  const { read } = await apiFetch<{ read: number }>('/notifications/read-all', { method: 'PATCH' });
  return read;
}
