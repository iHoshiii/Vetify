import type { Thread } from '@/services/messages.service';
import { createContext, useContext } from 'react';

export type ChatContextValue = {
  open: boolean;
  activeThread: Thread | null;
  starting: boolean;
  openPanel: () => void;
  closePanel: () => void;
  openThread: (thread: Thread | null) => void;
  startWithVet: (professionalId: string) => void;
  startError: string | null;
};

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatPanel(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatPanel must be used inside a ChatProvider');
  return context;
}
