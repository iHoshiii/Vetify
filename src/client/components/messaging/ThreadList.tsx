import { useThreads } from '@/hooks/useMessages';
import type { Thread, ThreadSide } from '@/services/messages.service';

// A relative-ish stamp for a list row: time today, otherwise the date.
function whenOf(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function labelOf(thread: Thread): string {
  return thread.with?.name ?? thread.with?.email ?? 'Unknown';
}

function previewOf(thread: Thread): string {
  if (!thread.lastBody) return 'No messages yet';
  return thread.lastFromYou ? `You: ${thread.lastBody}` : thread.lastBody;
}

// The caller's threads on one side, newest first, each opening a conversation on click.
export default function ThreadList({
  side,
  onOpen,
}: {
  side: ThreadSide;
  onOpen: (thread: Thread) => void;
}) {
  const { data, isLoading } = useThreads(side);
  const threads = data?.items ?? [];

  if (isLoading && threads.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">Loading…</p>;
  }
  if (threads.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No conversations yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onOpen(thread)}
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
        </li>
      ))}
    </ul>
  );
}
