import { useProfessionalSlots } from '@/hooks/useProfessionals';
import { APPOINTMENT_HORIZON_DAYS } from '@shared/limits';
import { useMemo, useState } from 'react';

import DayStrip from './day-strip';
import ErrorNote from './error-note';
import { addDays, dayLabel, manilaToday, timeOf } from './slot-time';

/** How many days the strip offers at once. A fortnight fits a phone without scrolling. */
const DAYS_SHOWN = 14;

const SLOT = 'rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed';
const FREE = 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50';
const ON = 'border-teal-700 bg-teal-800 text-white';
const TAKEN = 'border-slate-200 bg-slate-100 text-slate-400 line-through';

/**
 * Step three: which slot. A taken one is disabled rather than hidden, because a day
 * showing nothing would read as a day the vet does not work — a different fact.
 */
export default function SlotPicker({
  professionalId,
  value,
  onPick,
}: {
  professionalId: string;
  value: string | null;
  onPick: (at: string) => void;
}) {
  const today = useMemo(() => manilaToday(), []);
  const [date, setDate] = useState(today);

  // The whole fortnight in one read, so moving between days is instant.
  const grid = useProfessionalSlots({
    id: professionalId,
    from: today,
    to: addDays(today, Math.min(DAYS_SHOWN, APPOINTMENT_HORIZON_DAYS) - 1),
  });

  const days = grid.data?.days ?? [];
  const chosen = days.find((day) => day.date === date);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pick a time</p>
        {grid.data && (
          <p className="text-xs text-slate-500">
            {grid.data.minutes} minutes each &middot; Philippine time
          </p>
        )}
      </div>

      {grid.isPending && <p className="mt-3 text-sm text-slate-600">Reading their diary…</p>}

      {grid.isError && (
        <ErrorNote message="Their diary would not load." onRetry={() => void grid.refetch()} />
      )}

      {days.length > 0 && (
        <>
          <DayStrip days={days} value={date} onPick={setDate} />

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
                    onClick={() => onPick(slot.at)}
                    aria-pressed={value === slot.at}
                    aria-label={slot.taken ? `${timeOf(slot.at)}, already taken` : timeOf(slot.at)}
                    className={`${SLOT} w-full ${
                      slot.taken ? TAKEN : value === slot.at ? ON : FREE
                    }`}
                  >
                    {timeOf(slot.at)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
