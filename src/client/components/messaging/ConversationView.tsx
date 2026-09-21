import { useMessages, useSendMessage } from '@/hooks/useMessages';
import type { Thread } from '@/services/messages.service';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

// The other party's display name, falling back to their email, then a neutral label.
function nameOf(thread: Thread): string {
  return thread.with?.name ?? thread.with?.email ?? 'Conversation';
}

// One open conversation: a header, the message list, and the composer. onBack is optional so the professional page can omit it.
export default function ConversationView({
  thread,
  onBack,
}: {
  thread: Thread;
  onBack?: () => void;
}) {
  const { data, isLoading } = useMessages(thread.id);
  const send = useSendMessage(thread.id);
  const endRef = useRef<HTMLDivElement>(null);

  // Stick to the newest message as it arrives, the way a chat is read.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.items.length]);

  const messages = data?.items ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="truncate text-sm font-bold text-slate-900">{nameOf(thread)}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No messages yet. Say hello to get started.
          </p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={endRef} />
      </div>

      <MessageComposer onSend={(body) => send.mutate(body)} sending={send.isPending} />
    </div>
  );
}
