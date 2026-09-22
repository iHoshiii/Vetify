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
}: {
  shelf: ThreadState;
  onChange: (shelf: ThreadState) => void;
}) {
  return (
    <div
      className="flex gap-1 border-b border-slate-200 px-2 py-1.5"
      role="tablist"
      aria-label="Message folders"
    >
      {SHELVES.map((entry) => (
        <button
          key={entry.state}
          type="button"
          role="tab"
          aria-selected={shelf === entry.state}
          onClick={() => onChange(entry.state)}
          className={`min-w-0 flex-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
            shelf === entry.state ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
