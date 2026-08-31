import type { DaySlots } from '@/services/professionals.service';

import { dayLabel } from './slot-time';

const TAB =
  'flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-xs font-bold transition';
const ON = 'border-teal-700 bg-teal-800 text-white';
const OFF = 'border-slate-200 bg-white text-slate-700 hover:border-teal-700';

/** The fortnight, counting free slots per day so a Tuesdays-only vet looks like one. */
export default function DayStrip({
  days,
  value,
  onPick,
}: {
  days: DaySlots[];
  value: string;
  onPick: (date: string) => void;
}) {
  return (
    <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
      {days.map((day) => {
        const free = day.slots.filter((slot) => !slot.taken).length;
        const on = value === day.date;

        return (
          <li key={day.date}>
            <button
              type="button"
              onClick={() => onPick(day.date)}
              aria-pressed={on}
              className={`${TAB} ${on ? ON : OFF}`}
            >
              <span>{dayLabel(day.date, { weekday: 'short' })}</span>
              <span className="text-base font-black">{dayLabel(day.date, { day: 'numeric' })}</span>
              <span
                className={`text-[11px] font-semibold ${on ? 'text-white/80' : 'text-slate-500'}`}
              >
                {free > 0 ? `${free} free` : '—'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
