import { useLongPress } from '@/hooks/useLongPress';
import type { Thread } from '@/services/messages.service';
import { MoreVertical } from 'lucide-react';
import { useState } from 'react';

import ThreadMenu from './ThreadMenu';

function labelOf(thread: Thread): string {
  return thread.with?.name ?? thread.with?.email ?? 'Unknown';
}

function previewOf(thread: Thread): string {
  if (!thread.lastBody) return 'No messages yet';
  return thread.lastFromYou ? `You: ${thread.lastBody}` : thread.lastBody;
}

function whenOf(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// One conversation in the list: opens on click, reveals a menu on hover (desktop) or long-press (mobile).
export default function ThreadRow({ thread, onOpen }: { thread: Thread; onOpen: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPress = useLongPress(() => setMenuOpen(true));

  return (
    <li className="group relative" {...longPress}>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-100 text-xs font-black text-teal-800">
          {labelOf(thread).charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{labelOf(thread)}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{whenOf(thread.lastAt)}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span
              className={`truncate text-xs ${
                thread.unread > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'
              }`}
            >
              {previewOf(thread)}
            </span>
            {thread.unread > 0 && (
              <span className="shrink-0 rounded-full bg-teal-700 px-1.5 text-[10px] font-black text-white">
                {thread.unread}
              </span>
            )}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Conversation options"
        className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 focus:opacity-100 group-hover:opacity-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <ThreadMenu threadId={thread.id} shelf={thread.state} onDone={() => setMenuOpen(false)} />
      )}
    </li>
  );
}
