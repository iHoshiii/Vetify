import { useProfessionalSlots } from '@/hooks/useProfessionals';
import { APPOINTMENT_HORIZON_DAYS } from '@shared/limits';
import { useMemo, useState } from 'react';

import DayStrip from './day-strip';
import ErrorNote from './error-note';
import { nextSelection, spanLabel } from './slot-span';
import { addDays, dayLabel, manilaToday, timeOf } from './slot-time';

/** How many days the strip offers at once. A fortnight fits a phone without scrolling. */
const DAYS_SHOWN = 14;

const SLOT = 'rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed';
const FREE = 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50';
const ON = 'border-teal-700 bg-teal-800 text-white';
const TAKEN = 'border-slate-200 bg-slate-100 text-slate-400 line-through';
const CHOOSE =
  'mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-teal-800 px-6 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Step three: which slot, and for how long. A tap selects an hour rather than booking
 * it; a second tap on the next free hour makes it a two-hour visit, and "Choose time"
 * is what actually moves on — so a mis-tap is a re-tap, not a booking.
 */
export default function SlotPicker({
  professionalId,
  onChoose,
}: {
  professionalId: string;
  onChoose: (startsAt: string, slots: number) => void;
}) {
  const today = useMemo(() => manilaToday(), []);
  const [date, setDate] = useState(today);
  const [picked, setPicked] = useState<string[]>([]);

  // The whole fortnight in one read, so moving between days is instant.
  const grid = useProfessionalSlots({
    id: professionalId,
    from: today,
    to: addDays(today, Math.min(DAYS_SHOWN, APPOINTMENT_HORIZON_DAYS) - 1),
  });

  const minutes = grid.data?.minutes ?? 60;
  const days = grid.data?.days ?? [];
  const chosen = days.find((day) => day.date === date);

  // Moving to another day drops a half-made pick: an hour on Tuesday and one on Friday
  // is not a two-hour visit, and the server would refuse it anyway.
  function goToDay(next: string): void {
    setDate(next);
    setPicked([]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pick a time</p>
        {grid.data && (
          <p className="text-xs text-slate-500">
            {minutes} minutes each &middot; up to two in a row &middot; Philippine time
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
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {chosen?.slots.map((slot) => (
                <li key={slot.at}>
                  {/* The label is said out loud: a strike-through is not read aloud. */}
                  <button
                    type="button"
                    disabled={slot.taken}
                    onClick={() => setPicked((current) => nextSelection(current, slot, minutes))}
                    aria-pressed={picked.includes(slot.at)}
                    aria-label={slot.taken ? `${timeOf(slot.at)}, already taken` : timeOf(slot.at)}
                    className={`${SLOT} w-full ${
                      slot.taken ? TAKEN : picked.includes(slot.at) ? ON : FREE
                    }`}
                  >
                    {timeOf(slot.at)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-slate-700">{spanLabel(picked, minutes)}</p>
              <button
                type="button"
                onClick={() => onChoose(picked[0], picked.length)}
                className={CHOOSE}
              >
                Choose time
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
