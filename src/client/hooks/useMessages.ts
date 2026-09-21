import { ApiError } from '@/services/api';
import {
  getUnreadCount,
  listMessages,
  listThreads,
  openThread,
  sendMessage,
  type MessagePage,
  type PageParams,
  type Thread,
  type ThreadPage,
  type ThreadSide,
} from '@/services/messages.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Same factory shape as the appointment keys, so a signal can drop one thread, one side, or the whole family.
export const messageKeys = {
  all: ['messages'] as const,
  threads: (side: ThreadSide, params: PageParams) =>
    [...messageKeys.all, 'threads', side, params] as const,
  thread: (threadId: string, params: PageParams) =>
    [...messageKeys.all, 'thread', threadId, params] as const,
  unread: () => [...messageKeys.all, 'unread'] as const,
};

// A conversation is read while it is open, so it goes stale fast; the socket refetch is the real freshness.
const STALE_TIME = 30_000;
const POLL_INTERVAL = 30_000;

// A 4xx is an answer, not a blip. Retrying one just costs round trips.
function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

// One page of the caller's threads on the side they asked for.
export function useThreads(side: ThreadSide, params: PageParams = {}) {
  return useQuery<ThreadPage>({
    queryKey: messageKeys.threads(side, params),
    queryFn: ({ signal }) => listThreads(side, params, signal),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// One page of a thread's messages. Disabled until a thread is chosen, so the panel can call it unconditionally.
export function useMessages(threadId: string | null, params: PageParams = {}) {
  return useQuery<MessagePage>({
    queryKey: messageKeys.thread(threadId ?? '', params),
    queryFn: ({ signal }) => listMessages(threadId as string, params, signal),
    enabled: Boolean(threadId),
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// The caller's total unread across both sides, for the launcher badge.
export function useUnreadCount(enabled = true) {
  return useQuery<number>({
    queryKey: messageKeys.unread(),
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled,
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: retryUnlessRefused,
  });
}

// Open or reuse the thread with a vet, then land the caller in it.
export function useOpenThread() {
  const queryClient = useQueryClient();

  return useMutation<Thread, Error, string>({
    mutationFn: openThread,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

// Send into a thread. The socket echoes it back to the sender too, so the refetch is what draws it.
export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string; createdAt: string }, Error, string>({
    mutationFn: (body: string) => sendMessage(threadId, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}
