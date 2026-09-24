import { ApiError } from '@/services/api';
import {
  getUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationPage,
  type PageParams,
} from '@/services/notifications.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Same factory shape as the message keys, so a signal can drop the feed, the badge, or the whole family.
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: PageParams) => [...notificationKeys.all, 'list', params] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

const STALE_TIME = 30_000;
const POLL_INTERVAL = 30_000;

// A 4xx is an answer, not a blip. Retrying one just costs round trips.
function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

// One page of the caller's feed. Disabled until the panel opens, so the badge poll carries the idle case.
export function useNotifications(params: PageParams = {}, enabled = true) {
  return useQuery<NotificationPage>({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => listNotifications(params, signal),
    enabled,
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// The caller's unread total, for the bell badge. Polls like the message badge and refetches on socket events.
export function useUnreadNotifications(enabled = true) {
  return useQuery<number>({
    queryKey: notificationKeys.unread(),
    queryFn: ({ signal }) => getUnreadNotifications(signal),
    enabled,
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: retryUnlessRefused,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
