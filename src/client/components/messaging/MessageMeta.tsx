import { fullTime, shortTime } from './message-time';

export default function MessageMeta({
  createdAt,
  expanded,
  showTime,
  edited,
  mine,
  receipt,
}: {
  createdAt: string;
  expanded: boolean;
  showTime: boolean;
  edited: boolean;
  mine: boolean;
  receipt?: 'Delivered' | 'Seen' | null;
}) {
  const timeVisible = showTime || expanded;
  if (!timeVisible && !edited && !receipt) return null;

  return (
    <div
      data-testid="message-meta"
      className={`absolute top-full whitespace-nowrap pt-0.5 text-[10px] ${
        mine ? 'right-0 text-right' : 'left-0 text-left'
      }`}
    >
      {(timeVisible || edited) && (
        <p className="text-slate-400">
          {timeVisible && (expanded ? fullTime(createdAt) : shortTime(createdAt))}
          {edited ? `${timeVisible ? ' \u00b7 ' : ''}Edited` : ''}
        </p>
      )}
      {receipt && <p className="font-semibold text-teal-600">{receipt}</p>}
    </div>
  );
}
