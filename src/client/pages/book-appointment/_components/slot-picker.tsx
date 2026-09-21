import { useProfessionalSlots } from '@/hooks/useProfessionals';
import { APPOINTMENT_HORIZON_DAYS } from '@shared/limits';
import { useMemo, useState } from 'react';

import DayStrip from './day-strip';
import ErrorNote from './error-note';
import { runLabel, runsOf, slotRangeLabel, toggleSlot, type Run } from './slot-span';
import { addDays, dayLabel, manilaToday } from './slot-time';

/** How many days the strip offers at once. A fortnight fits a phone without scrolling. */
const DAYS_SHOWN = 14;

const SLOT =
  'w-full rounded-lg border px-2 py-2 text-xs font-bold tabular-nums transition disabled:cursor-not-allowed';
const FREE = 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50';
const ON = 'border-teal-700 bg-teal-800 text-white';
const TAKEN = 'border-slate-200 bg-slate-100 text-slate-400 line-through';
const CHOOSE =
  'inline-flex h-11 items-center justify-center rounded-lg bg-teal-800 px-6 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Step three: which hours. A tap adds or removes an hour, in any order, so a run of
 * hours in a row is one visit and hours apart are separate ones. "Choose time" moves
 * on with whatever is picked — a mis-tap is a re-tap.
 */
export default function SlotPicker({
  professionalId,
  onChoose,
}: {
  professionalId: string;
  onChoose: (runs: Run[]) => void;
}) {
  const today = useMemo(() => manilaToday(), []);
  const [date, setDate] = useState(today);
  const [picked, setPicked] = useState<string[]>([]);

  const grid = useProfessionalSlots({
    id: professionalId,
    from: today,
    to: addDays(today, Math.min(DAYS_SHOWN, APPOINTMENT_HORIZON_DAYS) - 1),
  });

  const minutes = grid.data?.minutes ?? 60;
  const days = grid.data?.days ?? [];
  const chosen = days.find((day) => day.date === date);
  const runs = runsOf(picked, minutes);

  // Moving day drops the picks: hours on two days are two visits the grid posts apart anyway.
  function goToDay(next: string): void {
    setDate(next);
    setPicked([]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pick your hours</p>
        {grid.data && (
          <p className="text-xs text-slate-500">
            Tap any hours &middot; ones in a row book together &middot; Philippine time
          </p>
        )}
      </div>

      {grid.isPending && <p className="mt-3 text-sm text-slate-600">Reading their diary…</p>}

      {grid.isError && (
        <ErrorNote message="Their diary would not load." onRetry={() => void grid.refetch()} />
      )}

      {days.length > 0 && (
        <>
          <DayStrip days={days} value={date} onPick={goToDay} />

          {chosen && chosen.slots.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Nothing on {dayLabel(chosen.date, { weekday: 'long', day: 'numeric', month: 'long' })}
              . Try another day.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {chosen?.slots.map((slot) => (
                <li key={slot.at}>
                  <button
                    type="button"
                    disabled={slot.taken}
                    onClick={() => setPicked((current) => toggleSlot(current, slot))}
                    aria-pressed={picked.includes(slot.at)}
                    aria-label={
                      slot.taken ? `${slotRangeLabel(slot.at, minutes)}, taken` : undefined
                    }
                    className={`${SLOT} ${
                      slot.taken ? TAKEN : picked.includes(slot.at) ? ON : FREE
                    }`}
                  >
                    {slotRangeLabel(slot.at, minutes)}
                  </button>
                </li>
              ))}
            </ul>
          )}

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
      )}
    </div>
  );
}
