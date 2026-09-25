import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { Notification } from '@/services/notifications.service';
import { CheckCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// A reminder opens the vet's Scheduled queue for that booking's kind; a decision or a review nudge opens the owner's bookings; a new request opens the vet's default Request queue.
function routeFor(notification: Notification): string {
  if (
    notification.kind === 'booking_confirmed' ||
    notification.kind === 'booking_declined' ||
    notification.kind === 'review_request'
  ) {
    return '/book-appointment';
  }
  if (notification.kind === 'booking_reminder') {
    const section = notification.appointmentKind === 'onsite' ? 'clinic-visits' : 'consultations';
    return `/professionals/dashboard/${section}?tab=scheduled`;
  }
  return '/professionals/dashboard';
}

// Coarse "how long ago" without pulling in a date library, since the feed only needs a rough age.
function ago(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({}, true);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = data?.items ?? [];
  const hasUnread = items.some((item) => !item.read);

  const open = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    onClose();
    navigate(routeFor(notification));
  };

  return (
    <div className="flex h-[min(32rem,calc(100vh-7rem))] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-black text-slate-900">Notifications</span>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="px-3 pt-3 text-xs text-slate-400">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <p className="px-3 pt-6 text-center text-xs text-slate-400">Nothing yet.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => open(item)}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50 ${
                  item.read ? '' : 'bg-teal-50/40'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.read ? 'bg-transparent' : 'bg-teal-600'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {item.title}
                  </span>
                  <span className="block text-xs text-slate-600">{item.body}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                    {ago(item.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
