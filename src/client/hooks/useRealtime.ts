import { useAuth } from '@/components/providers/AuthProvider';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { MessagePage, ThreadPage } from '@/services/messages.service';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { appointmentKeys } from './useAppointments';
import { messageKeys } from './useMessages';
import { notificationKeys } from './useNotifications';
import { clearPresence, notePresence, replacePresence } from './usePresence';
import { noteTyping } from './useTyping';

// The lightweight events the server pushes. Each carries only an id, so the client refetches rather than trusting a payload.
type ThreadEvent = { threadId: string };
type ReadEvent = ThreadEvent & { readAt: string };

// The one event that carries state rather than a bare id, since typing is too fleeting to refetch for.
type TypingEvent = { threadId: string; typing: boolean };
type PresenceEvent = { userId: string; online: boolean };
type PresenceSnapshot = { userIds: string[] };

/**
 * Bridges the socket to the query cache for the whole app, mounted once near the root.
 *
 * The server sends a bare signal, not the new row, so every viewer refetches through
 * the same access check that guards the REST read. Polling stays on underneath as the
 * fallback for a dropped socket, so a missed event is a slower update, never a lost one.
 */
export function useRealtime(): void {
  const { accessToken, status } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // A stored session starts in "loading" while its access token is refreshed.
    // Connecting before that finishes can strand Socket.IO on an expired handshake.
    if (status !== 'authenticated' || !accessToken) {
      disconnectSocket();
      clearPresence();
      return;
    }

    const socket = connectSocket(accessToken);

    // A new message, or the far side reading one: either way both the thread and the badge move.
    const onMessage = (event: ThreadEvent) => {
      void queryClient.invalidateQueries({
        queryKey: [...messageKeys.all, 'threads'],
        refetchType: 'all',
      });
      void queryClient.invalidateQueries({ queryKey: [...messageKeys.all, 'unread'] });
      void queryClient.invalidateQueries({
        queryKey: [...messageKeys.all, 'thread', event.threadId],
      });
    };
    // The far side read: the badge drops and the thread list's otherReadAt moves, so a "Seen" can appear.
    const onRead = (event: ReadEvent) => {
      const threadQueryKey = [...messageKeys.all, 'thread', event.threadId] as const;
      queryClient.setQueriesData<MessagePage>({ queryKey: threadQueryKey }, (page) =>
        page ? { ...page, otherReadAt: event.readAt } : page
      );
      queryClient.setQueriesData<ThreadPage>(
        { queryKey: [...messageKeys.all, 'threads'] },
        (page) =>
          page
            ? {
                ...page,
                items: page.items.map((thread) =>
                  thread.id === event.threadId ? { ...thread, otherReadAt: event.readAt } : thread
                ),
              }
            : page
      );
    };
    // A booking changing on the other console: refetch both lists and the tab counts.
    const onAppointment = () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    };
    // A new notification: the bell badge and, if open, the feed both refetch through the guarded read.
    const onNotification = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };
    // Typing carries its own flag, so it updates the ephemeral store instead of refetching.
    const onTyping = (e: TypingEvent) => noteTyping(e.threadId, e.typing);
    const onPresence = (event: PresenceEvent) => notePresence(event.userId, event.online);
    const onPresenceSnapshot = (snapshot: PresenceSnapshot) => replacePresence(snapshot.userIds);
    const onDisconnect = () => clearPresence();
    // Anything sent while this tab was offline is fetched as soon as Socket.IO reconnects.
    const onConnect = () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    socket.on('connect', onConnect);
    socket.on('thread:message', onMessage);
    socket.on('thread:read', onRead);
    socket.on('appointment:changed', onAppointment);
    socket.on('notification:new', onNotification);
    socket.on('thread:typing', onTyping);
    socket.on('presence:changed', onPresence);
    socket.on('presence:snapshot', onPresenceSnapshot);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('thread:message', onMessage);
      socket.off('thread:read', onRead);
      socket.off('appointment:changed', onAppointment);
      socket.off('notification:new', onNotification);
      socket.off('thread:typing', onTyping);
      socket.off('presence:changed', onPresence);
      socket.off('presence:snapshot', onPresenceSnapshot);
      socket.off('disconnect', onDisconnect);
      clearPresence();
    };
  }, [accessToken, status, queryClient]);
}
