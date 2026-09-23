import { useThreads, useUnreadCount } from '@/hooks/useMessages';
import type { Thread, ThreadSide, ThreadState } from '@/services/messages.service';
import { useState } from 'react';

import ShelfTabs from './ShelfTabs';
import ThreadRow from './ThreadRow';

// A shelf's empty state reads differently: an empty inbox invites, an empty archive just reports.
function emptyOf(shelf: ThreadState): string {
  if (shelf === 'archived') return 'Nothing archived.';
  if (shelf === 'spam') return 'No spam.';
  return 'No conversations yet.';
}

// The caller's threads on one side, filtered by shelf, each opening a conversation on click.
export default function ThreadList({
  side,
  onOpen,
  onThreadMoved,
}: {
  side: ThreadSide;
  onOpen: (thread: Thread) => void;
  onThreadMoved?: (threadId: string) => void;
}) {
  const [shelf, setShelf] = useState<ThreadState>('active');
  const { data, isLoading, error } = useThreads(side, { state: shelf });
  const { data: unread = 0 } = useUnreadCount(true, side);
  const threads = data?.items ?? [];

  return (
    <>
      <ShelfTabs shelf={shelf} onChange={setShelf} activeUnread={unread} />
      {isLoading && threads.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
      ) : error ? (
        // A failed load is not an empty inbox, so it says so rather than reading as "no threads".
        <p className="py-8 text-center text-xs text-rose-500">{error.message}</p>
      ) : threads.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">{emptyOf(shelf)}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              onOpen={() => onOpen(thread)}
              onMoved={() => onThreadMoved?.(thread.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
