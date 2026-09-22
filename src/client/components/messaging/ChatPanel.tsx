import { useAuth } from '@/components/providers/AuthProvider';
import type { Thread, ThreadSide } from '@/services/messages.service';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useChatPanel } from './chat-context';
import ConversationView from './ConversationView';
import MessageSideTabs from './MessageSideTabs';
import ThreadList from './ThreadList';

// A vet inquires as a client under Messages and answers inquirers under Inquiry; a normal user only ever does the former.
// The launcher's dropdown: a thread list, or the open conversation.
export default function ChatPanel() {
  const { user } = useAuth();
  const { activeThread, starting, startError, openThread, closePanel } = useChatPanel();
  const [side, setSide] = useState<ThreadSide>('mine');
  const isProfessional = user?.role === 'professional';

  useEffect(() => {
    if (isProfessional) setSide('incoming');
  }, [isProfessional]);

  if (activeThread) {
    return (
      <Shell>
        <ConversationView thread={activeThread} onBack={() => openThread(null)} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        {isProfessional ? (
          <MessageSideTabs side={side} onChange={setSide} />
        ) : (
          <span className="text-sm font-black text-slate-900">Messages</span>
        )}
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close messages"
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {starting && <p className="px-3 pt-3 text-xs text-slate-400">Opening conversation…</p>}
        {startError && !starting && (
          <p className="mx-3 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {startError}
          </p>
        )}
        <ThreadList
          side={isProfessional ? side : 'mine'}
          onOpen={(thread: Thread) => openThread(thread)}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[min(36rem,calc(100vh-7rem))] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
      {children}
    </div>
  );
}
