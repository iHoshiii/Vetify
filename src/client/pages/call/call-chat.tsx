import { MESSAGE_MAX_LENGTH } from '@shared/limits';
import { MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { ChatMessage } from './use-call-chat';

// The in-call chat: a floating button that opens a side panel, so a muted participant can still type.
export default function CallChat({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const fromThem = messages.filter((m) => !m.mine).length;
  const unread = open ? 0 : Math.max(0, fromThem - seen);

  // Clear the badge the moment the panel is open, and keep it clear as new lines land.
  useEffect(() => {
    if (open) setSeen(fromThem);
  }, [open, fromThem]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend(text);
    setText('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className="fixed right-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white shadow-lg backdrop-blur transition-colors hover:bg-slate-700"
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-black text-slate-900">Chat</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-xs text-slate-400">
            No messages yet. This works even while you are muted.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <span
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                m.mine ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder="Type a message"
          className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-500 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
}
