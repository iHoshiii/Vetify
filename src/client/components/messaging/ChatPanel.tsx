import type { Thread } from '@/services/messages.service';
import { X } from 'lucide-react';

import { useChatPanel } from './ChatProvider';
import ConversationView from './ConversationView';
import ThreadList from './ThreadList';

// The launcher's dropdown: the owner's thread list, or the open conversation. The vet console has its own full-page version.
export default function ChatPanel() {
  const { activeThread, starting, openThread, closePanel } = useChatPanel();

  return (
    <div className="flex h-[28rem] w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
      {activeThread ? (
        <ConversationView thread={activeThread} onBack={() => openThread(null)} />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-sm font-black text-slate-900">Messages</span>
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
            <ThreadList side="mine" onOpen={(thread: Thread) => openThread(thread)} />
          </div>
        </>
      )}
    </div>
  );
}
