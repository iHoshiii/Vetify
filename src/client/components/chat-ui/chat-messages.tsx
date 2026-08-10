import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/chat-storage';
import { ChatMessage } from './chat-message';

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  lastUserIndex: number;
  onEdit: (index: number) => void;
}

export function ChatMessages({ messages, loading, lastUserIndex, onEdit }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {messages.map((m, i) => (
        <ChatMessage
          key={i}
          message={m}
          index={i}
          isLastUser={i === lastUserIndex}
          loading={loading}
          onEdit={onEdit}
        />
      ))}
      {loading && (
        <div className="flex gap-3 justify-start">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm mt-1">
            <span className="text-sm">🐾</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center h-4">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
