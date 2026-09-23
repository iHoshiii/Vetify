import type { ThreadState } from '@/services/messages.service';

// The three listable shelves and the label each shows.
const SHELVES: Array<{ state: ThreadState; label: string }> = [
  { state: 'active', label: 'Messages' },
  { state: 'archived', label: 'Archived' },
  { state: 'spam', label: 'Spam' },
];

// A segmented control that switches which shelf the thread list is reading.
export default function ShelfTabs({
  shelf,
  onChange,
  activeUnread = 0,
}: {
  shelf: ThreadState;
  onChange: (shelf: ThreadState) => void;
  // Unread threads live on the active shelf, so only that tab carries a count.
  activeUnread?: number;
}) {
  return (
    <div
      className="flex gap-1 border-b border-slate-200 px-2 py-1.5"
      role="tablist"
      aria-label="Message folders"
    >
      {SHELVES.map((entry) => {
        const count = entry.state === 'active' ? activeUnread : 0;
        return (
          <button
            key={entry.state}
            type="button"
            role="tab"
            aria-selected={shelf === entry.state}
            aria-label={count > 0 ? `${entry.label}, ${count} unread` : entry.label}
            onClick={() => onChange(entry.state)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              shelf === entry.state ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {entry.label}
            {count > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
