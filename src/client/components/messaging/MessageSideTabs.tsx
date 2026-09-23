import { useUnreadCount } from '@/hooks/useMessages';
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
  const mine = useUnreadCount(true, 'mine');
  const incoming = useUnreadCount(true, 'incoming');
  // Each tab shows its own side's unread total.
  const unread: Record<ThreadSide, number> = {
    mine: mine.data ?? 0,
    incoming: incoming.data ?? 0,
  };

  return (
    <div className="flex min-w-0 flex-1 gap-1" role="tablist" aria-label="Conversation type">
      {TABS.map((tab) => {
        const count = unread[tab.side];
        return (
          <button
            key={tab.side}
            type="button"
            role="tab"
            aria-selected={side === tab.side}
            aria-label={count > 0 ? `${tab.label}, ${count} unread` : tab.label}
            onClick={() => onChange(tab.side)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
              side === tab.side ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.label}
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
