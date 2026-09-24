import { MESSAGE_MAX_LENGTH } from '@shared/limits';
import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { ChatMessage } from './use-call-chat';

// The in-call chat side panel, opened from the control bar so a muted participant can still type.
export default function CallChat({
  open,
  onClose,
  messages,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend(text);
    setText('');
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-black text-slate-900">Chat</span>
        <button
          type="button"
          onClick={onClose}
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
