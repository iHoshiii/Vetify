import { MESSAGE_MAX_LENGTH } from '@shared/limits';
import { SendHorizonal } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

// The text box and send button for a conversation. Enter sends, Shift+Enter breaks a line.
export default function MessageComposer({
  onSend,
  onType,
  sending,
}: {
  onSend: (body: string) => void;
  onType?: (typing: boolean) => void;
  sending: boolean;
}) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText('');
    onType?.(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-2">
      <textarea
        rows={1}
        value={text}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(e) => {
          setText(e.target.value);
          onType?.(e.target.value.trim().length > 0);
        }}
        onBlur={() => onType?.(false)}
        onKeyDown={onKeyDown}
        placeholder="Write a message…"
        className="max-h-28 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!trimmed || sending}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SendHorizonal className="h-4 w-4" />
      </button>
    </div>
  );
}
