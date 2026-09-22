import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';
import { useTypingEmitter } from '@/hooks/useTypingEmitter';
import type { Thread } from '@/services/messages.service';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ConversationStatus, { deliveryStatus } from './ConversationStatus';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import ParticipantAvatar from './ParticipantAvatar';
import ThreadMenu from './ThreadMenu';

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
  const onType = useTypingEmitter(thread.id);
  const otherTyping = useTyping(thread.id);
  const endRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(thread.muted);

  useEffect(() => setMuted(thread.muted), [thread.id, thread.muted]);

  // Stick to the newest message as it arrives, or as the other side starts typing.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.items.length, otherTyping]);

  const messages = data?.items ?? [];
  const lastMineIndex = messages.reduce(
    (lastIndex, message, index) => (message.fromYou ? index : lastIndex),
    -1
  );
  const receipt = deliveryStatus(data?.otherReadAt ?? thread.otherReadAt, messages);
  const participantName = nameOf(thread);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex min-h-14 items-center gap-2 border-b border-slate-200 px-4 py-2">
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
        <ParticipantAvatar name={participantName} avatarUrl={thread.with?.avatarUrl} size="md" />
        <span className="truncate text-sm font-bold text-slate-900">{participantName}</span>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Conversation options"
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <ThreadMenu
              thread={{ ...thread, muted }}
              variant="header"
              onDone={() => setMenuOpen(false)}
              onCloseThread={onBack}
              onMutedChange={setMuted}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-4 py-4 sm:px-6">
        {isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No messages yet. Say hello to get started.
          </p>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              receipt={index === lastMineIndex ? receipt : null}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <ConversationStatus typing={otherTyping} />
      <MessageComposer
        onSend={(body) => send.mutate(body)}
        onType={onType}
        sending={send.isPending}
      />
    </div>
  );
}
