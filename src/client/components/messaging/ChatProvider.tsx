import { useOpenThread } from '@/hooks/useMessages';
import type { Thread } from '@/services/messages.service';
import React, { useCallback, useMemo, useState } from 'react';

import { ChatContext, type ChatContextValue } from './chat-context';

// Holds the floating chat panel's open state and which thread it is showing, so the launcher and a deep-nested Chat button drive the same panel.
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const openMutation = useOpenThread();

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const openThread = useCallback((thread: Thread | null) => setActiveThread(thread), []);

  const startWithVet = useCallback(
    (professionalId: string) => {
      setOpen(true);
      openMutation.mutate(professionalId, {
        onSuccess: (thread) => setActiveThread(thread),
      });
    },
    [openMutation]
  );

  const startError = openMutation.isError
    ? openMutation.error?.message ?? 'Could not open the conversation.'
    : null;

  const value = useMemo<ChatContextValue>(
    () => ({
      open,
      activeThread,
      starting: openMutation.isPending,
      openPanel,
      closePanel,
      openThread,
      startWithVet,
      startError,
    }),
    [
      open,
      activeThread,
      openMutation.isPending,
      openPanel,
      closePanel,
      openThread,
      startWithVet,
      startError,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
