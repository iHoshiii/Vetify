import { useOpenThread } from '@/hooks/useMessages';
import type { Thread } from '@/services/messages.service';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ChatContextValue = {
  open: boolean;
  // The open conversation, or null to show the thread list. Held whole so the header renders without a lookup, and a brand-new thread with no messages shows even though it would sort last.
  activeThread: Thread | null;
  // True while startWithVet is resolving a thread, so the button that called it can show it working.
  starting: boolean;
  openPanel: () => void;
  closePanel: () => void;
  // Show a specific thread in the panel, or the list when null.
  openThread: (thread: Thread | null) => void;
  // Open (or reuse) the thread with a vet, then land in it. Used by the vet card's Chat button.
  startWithVet: (professionalId: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

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

  const value = useMemo<ChatContextValue>(
    () => ({
      open,
      activeThread,
      starting: openMutation.isPending,
      openPanel,
      closePanel,
      openThread,
      startWithVet,
    }),
    [open, activeThread, openMutation.isPending, openPanel, closePanel, openThread, startWithVet]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatPanel(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatPanel must be used inside a ChatProvider');
  return ctx;
}
