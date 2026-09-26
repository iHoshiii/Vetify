import type { DaySlots } from '@/services/professionals.service';
import { useLocalePreferences } from '@/components/providers/LocaleProvider';

import { addMonths, dayLabel, monthCells, monthKeyOf } from './slot-time';

const NAV =
  'rounded-lg px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';
const CELL = 'flex aspect-square flex-col items-center justify-center rounded-md text-xs font-bold';
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
  const { locale } = useLocalePreferences();
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2024, 0, 7 + index)))
      .slice(0, 2)
  );
  const freeBy = new Map(days.map((day) => [day.date, day.slots.filter((s) => !s.taken).length]));
  const base = monthKeyOf(today);
  const [baseYear, baseMonth] = base.split('-').map(Number);
  const [year, mon] = month.split('-').map(Number);
  // Two short selects beat one long native dropdown that spills over the browser chrome.
  const years = Array.from({ length: Math.max(6, year - baseYear + 1) }, (_u, i) => baseYear + i);
  const first = year === baseYear ? baseMonth : 1;
  const monthNums = Array.from({ length: 13 - first }, (_u, i) => first + i);
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, m - 1, 1))
    );
  const pickYear = (next: number) =>
    onMonth(key(next, next === baseYear ? Math.max(mon, baseMonth) : mon));

  return (
    <div className="mx-auto mt-3 max-w-[350px] rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(addMonths(month, -1))}
          disabled={month <= monthKeyOf(today)}
          className={NAV}
        >
          ‹ Prev
        </button>
        <div className="flex items-center gap-1">
          <select
            value={mon}
            onChange={(event) => onMonth(key(year, Number(event.target.value)))}
            aria-label="Month"
            className="cursor-pointer rounded-lg bg-transparent px-1 py-1 text-sm font-black text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            {monthNums.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(event) => pickYear(Number(event.target.value))}
            aria-label="Year"
            className="cursor-pointer rounded-lg bg-transparent px-1 py-1 text-sm font-black text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => onMonth(addMonths(month, 1))} className={NAV}>
          Next ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
        {weekdays.map((day) => (
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
