import type { ThreadSide } from '@/services/messages.service';

const TABS: Array<{ side: ThreadSide; label: string }> = [
  { side: 'incoming', label: 'Inquiry' },
  { side: 'mine', label: 'Messages' },
];

export default function MessageSideTabs({
  side,
  onChange,
}: {
  side: ThreadSide;
  onChange: (side: ThreadSide) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-1" role="tablist" aria-label="Conversation type">
      {TABS.map((tab) => (
        <button
          key={tab.side}
          type="button"
          role="tab"
          aria-selected={side === tab.side}
          onClick={() => onChange(tab.side)}
          className={`min-w-0 flex-1 rounded-lg px-3 py-1.5 text-xs font-black transition ${
            side === tab.side ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
