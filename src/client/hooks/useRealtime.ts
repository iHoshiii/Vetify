import { useAuth } from '@/components/providers/AuthProvider';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { appointmentKeys } from './useAppointments';
import { messageKeys } from './useMessages';
import { noteTyping } from './useTyping';

// The lightweight events the server pushes. Each carries only an id, so the client refetches rather than trusting a payload.
type ThreadEvent = { threadId: string };

// The one event that carries state rather than a bare id, since typing is too fleeting to refetch for.
type TypingEvent = { threadId: string; typing: boolean };

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
      return;
    }

    const socket = connectSocket(accessToken);

    // A new message, or the far side reading one: either way both the thread and the badge move.
    const onMessage = (_e: ThreadEvent) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    };
    // The far side read: the badge drops and the thread list's otherReadAt moves, so a "Seen" can appear.
    const onRead = (_e: ThreadEvent) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    };
    // A booking changing on the other console: refetch both lists and the tab counts.
    const onAppointment = () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    };
    // Typing carries its own flag, so it updates the ephemeral store instead of refetching.
    const onTyping = (e: TypingEvent) => noteTyping(e.threadId, e.typing);
    // Anything sent while this tab was offline is fetched as soon as Socket.IO reconnects.
    const onConnect = () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    };

    socket.on('connect', onConnect);
    socket.on('thread:message', onMessage);
    socket.on('thread:read', onRead);
    socket.on('appointment:changed', onAppointment);
    socket.on('thread:typing', onTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('thread:message', onMessage);
      socket.off('thread:read', onRead);
      socket.off('appointment:changed', onAppointment);
      socket.off('thread:typing', onTyping);
    };
  }, [accessToken, status, queryClient]);
}
