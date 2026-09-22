import { ApiError } from '@/services/api';
import {
  getUnreadCount,
  listMessages,
  listThreads,
  openThread,
  reportThread,
  sendMessage,
  setThreadMuted,
  setThreadRead,
  setThreadState,
  type MessagePage,
  type PageParams,
  type Thread,
  type ThreadPage,
  type ThreadSide,
  type ThreadState,
} from '@/services/messages.service';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

// Same factory shape as the appointment keys, so a signal can drop one thread, one side, or the whole family.
export const messageKeys = {
  all: ['messages'] as const,
  threads: (side: ThreadSide, params: PageParams) =>
    [...messageKeys.all, 'threads', side, params] as const,
  thread: (threadId: string, params: PageParams) =>
    [...messageKeys.all, 'thread', threadId, params] as const,
  unread: (side: ThreadSide | 'all' = 'all') => [...messageKeys.all, 'unread', side] as const,
};

// A conversation is read while it is open, so it goes stale fast; the socket refetch is the real freshness.
const STALE_TIME = 30_000;
const POLL_INTERVAL = 30_000;

type SendContext = {
  snapshots: Array<[QueryKey, MessagePage | undefined]>;
  optimisticId: string;
};

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
  const queryClient = useQueryClient();

  return useQuery<MessagePage>({
    queryKey: messageKeys.thread(threadId ?? '', params),
    queryFn: async ({ signal }) => {
      const page = await listMessages(threadId as string, params, signal);

      // The GET marks this thread read. Refresh both badge and list state without
      // waiting for this browser tab to receive its own realtime event.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...messageKeys.all, 'threads'] }),
        queryClient.invalidateQueries({ queryKey: [...messageKeys.all, 'unread'] }),
      ]);

      return page;
    },
    enabled: Boolean(threadId),
    // Opening a conversation is the read action, even when its messages are still cached.
    refetchOnMount: 'always',
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// The caller's total unread across both sides, for the launcher badge.
export function useUnreadCount(enabled = true, side: ThreadSide | 'all' = 'all') {
  return useQuery<number>({
    queryKey: messageKeys.unread(side),
    queryFn: ({ signal }) => getUnreadCount(side === 'all' ? undefined : side, signal),
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

// Send into a thread. Draw it immediately, then reconcile its temporary id with the server response.
export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();
  const threadQueryKey = [...messageKeys.all, 'thread', threadId] as const;

  return useMutation<{ id: string; createdAt: string }, Error, string, SendContext>({
    mutationFn: (body: string) => sendMessage(threadId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: threadQueryKey });
      const snapshots = queryClient.getQueriesData<MessagePage>({ queryKey: threadQueryKey });
      const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      queryClient.setQueriesData<MessagePage>({ queryKey: threadQueryKey }, (page) =>
        page
          ? {
              ...page,
              items: [
                ...page.items,
                {
                  id: optimisticId,
                  threadId,
                  body,
                  fromYou: true,
                  createdAt: new Date().toISOString(),
                },
              ],
              total: page.total + 1,
            }
          : page
      );

      return { snapshots, optimisticId };
    },
    onError: (_error, _body, context) => {
      context?.snapshots.forEach(([key, page]) => queryClient.setQueryData(key, page));
    },
    onSuccess: (sent, _body, context) => {
      if (!context) return;
      queryClient.setQueriesData<MessagePage>({ queryKey: threadQueryKey }, (page) =>
        page
          ? {
              ...page,
              items: page.items.map((message) =>
                message.id === context.optimisticId
                  ? { ...message, id: sent.id, createdAt: sent.createdAt }
                  : message
              ),
            }
          : page
      );
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

// File a thread on a shelf, then refetch every list so it leaves one tab and joins another.
export function useSetThreadState() {
  const queryClient = useQueryClient();

  return useMutation<{ state: ThreadState }, Error, { threadId: string; state: ThreadState }>({
    mutationFn: ({ threadId, state }) => setThreadState(threadId, state),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

export function useSetThreadRead() {
  const queryClient = useQueryClient();

  return useMutation<{ unread: boolean }, Error, { threadId: string; unread: boolean }>({
    mutationFn: ({ threadId, unread }) => setThreadRead(threadId, unread),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

export function useMuteThread() {
  const queryClient = useQueryClient();

  return useMutation<{ muted: boolean }, Error, { threadId: string; muted: boolean }>({
    mutationFn: ({ threadId, muted }) => setThreadMuted(threadId, muted),
    onSuccess: ({ muted }, { threadId }) => {
      queryClient.setQueriesData<ThreadPage>(
        { queryKey: [...messageKeys.all, 'threads'] },
        (page) =>
          page
            ? {
                ...page,
                items: page.items.map((thread) =>
                  thread.id === threadId ? { ...thread, muted } : thread
                ),
              }
            : page
      );
      void queryClient.invalidateQueries({ queryKey: [...messageKeys.all, 'unread'] });
    },
  });
}

export function useReportThread() {
  return useMutation<{ reported: true }, Error, string>({ mutationFn: reportThread });
}
