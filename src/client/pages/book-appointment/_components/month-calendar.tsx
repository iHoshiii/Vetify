import type { DaySlots } from '@/services/professionals.service';

import { addMonths, dayLabel, monthCells, monthKeyOf, monthLabel } from './slot-time';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const NAV =
  'rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';
const CELL = 'flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold';
const ON = 'bg-teal-800 text-white';
const OPEN = 'text-slate-900 hover:bg-teal-50';
const OFF = 'cursor-not-allowed text-slate-300';

// Any month with a bookable day is reachable, so prev stops at this one and next never does.
export default function MonthCalendar({
  month,
  today,
  days,
  value,
  onMonth,
  onPick,
}: {
  month: string;
  today: string;
  days: DaySlots[];
  value: string;
  onMonth: (next: string) => void;
  onPick: (date: string) => void;
}) {
  const freeBy = new Map(days.map((day) => [day.date, day.slots.filter((s) => !s.taken).length]));

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(addMonths(month, -1))}
          disabled={month <= monthKeyOf(today)}
          className={NAV}
        >
          ‹ Prev
        </button>
        <p className="text-sm font-black text-slate-900">{monthLabel(month)}</p>
        <button type="button" onClick={() => onMonth(addMonths(month, 1))} className={NAV}>
          Next ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthCells(month).map((date, index) => {
          if (!date) return <span key={`pad-${index}`} />;
          const free = freeBy.get(date) ?? 0;
          const open = date >= today && free > 0;
          const on = value === date;
          return (
            <button
              key={date}
              type="button"
              disabled={!open}
              onClick={() => onPick(date)}
              aria-pressed={on}
              aria-label={dayLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
              className={`${CELL} ${on ? ON : open ? OPEN : OFF}`}
            >
              {dayLabel(date, { day: 'numeric' })}
              <span
                className={`mt-0.5 h-1 w-1 rounded-full ${
                  open ? (on ? 'bg-white' : 'bg-teal-600') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
