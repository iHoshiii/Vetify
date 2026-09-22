import { useSetThreadState } from '@/hooks/useMessages';
import type { ThreadState } from '@/services/messages.service';
import { Archive, Ban, RotateCcw, Trash2 } from 'lucide-react';

type Action = { label: string; state: ThreadState; icon: typeof Archive; danger?: boolean };

// What a row on the active shelf can do, versus one already filed away.
const FILED: Action = { label: 'Move to inbox', state: 'active', icon: RotateCcw };
const ACTIVE_ACTIONS: Action[] = [
  { label: 'Archive', state: 'archived', icon: Archive },
  { label: 'Mark as spam', state: 'spam', icon: Ban },
  { label: 'Delete', state: 'deleted', icon: Trash2, danger: true },
];

// The archive/spam/delete popover for one thread, or a single restore when the thread is already filed.
export default function ThreadMenu({
  threadId,
  shelf,
  onDone,
}: {
  threadId: string;
  shelf: ThreadState;
  onDone: () => void;
}) {
  const setState = useSetThreadState();
  const actions = shelf === 'active' ? ACTIVE_ACTIONS : [FILED];

  const run = (state: ThreadState) => {
    setState.mutate({ threadId, state });
    onDone();
  };

  return (
    <div
      role="menu"
      className="absolute right-2 top-10 z-10 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
    >
      {actions.map((action) => (
        <button
          key={action.state}
          type="button"
          role="menuitem"
          onClick={() => run(action.state)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${
            action.danger ? 'text-rose-600' : 'text-slate-700'
          }`}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
