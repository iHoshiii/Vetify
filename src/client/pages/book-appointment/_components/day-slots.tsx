import type { DaySlots as Day } from '@/services/professionals.service';

import { runLabel, runsOf, slotRangeLabel, toggleSlot, type Run } from './slot-span';
import { dayLabel } from './slot-time';

const SLOT =
  'w-full rounded-lg border px-2 py-2 text-xs font-bold tabular-nums transition disabled:cursor-not-allowed';
const FREE = 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50';
const ON = 'border-teal-700 bg-teal-800 text-white';
const TAKEN = 'border-slate-200 bg-slate-100 text-slate-400 line-through';
const CHOOSE =
  'inline-flex h-11 items-center justify-center rounded-lg bg-teal-800 px-6 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60';

// The picked hours for the chosen day, grouped into runs on the way to the confirm step.
export default function DaySlots({
  day,
  minutes,
  picked,
  onToggle,
  onChoose,
}: {
  day: Day | undefined;
  minutes: number;
  picked: string[];
  onToggle: (next: string[]) => void;
  onChoose: (runs: Run[]) => void;
}) {
  if (!day) return <p className="mt-3 text-sm text-slate-600">Pick a day to see its hours.</p>;
  const runs = runsOf(picked, minutes);

  if (day.slots.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-600">
        Nothing on {dayLabel(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}. Try
        another day.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {day.slots.map((slot) => (
          <li key={slot.at}>
            <button
              type="button"
              disabled={slot.taken}
              onClick={() => onToggle(toggleSlot(picked, slot))}
              aria-pressed={picked.includes(slot.at)}
              aria-label={slot.taken ? `${slotRangeLabel(slot.at, minutes)}, taken` : undefined}
              className={`${SLOT} ${slot.taken ? TAKEN : picked.includes(slot.at) ? ON : FREE}`}
            >
              {slotRangeLabel(slot.at, minutes)}
            </button>
          </li>
        ))}
      </ul>

      {runs.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {runs.length === 1 ? 'Your visit' : `${runs.length} separate visits`}
          </p>
          <ul className="mt-2 space-y-1">
            {runs.map((run) => (
              <li key={run.startsAt} className="text-sm font-semibold text-slate-800">
                {runLabel(run, minutes)}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onChoose(runs)} className={`${CHOOSE} mt-3`}>
            Choose {runs.length === 1 ? 'time' : 'times'}
          </button>
        </div>
      )}
    </>
  );
}
