import { useProfessionalSlots } from '@/hooks/useProfessionals';
import { APPOINTMENT_HORIZON_DAYS, MANILA_UTC_OFFSET_HOURS } from '@shared/limits';
import { useMemo, useState } from 'react';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** How many days the strip offers at once. A fortnight fits without scrolling on a phone. */
const DAYS_SHOWN = 14;

/**
 * Today in Manila.
 *
 * The grid is generated in Manila time on the server, so the client has to agree about
 * which day "today" is or the first column would be yesterday for anybody east of it.
 */
function manilaToday(): string {
  return new Date(Date.now() + MANILA_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` read as a Manila date, for labelling only. */
function label(date: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-PH', {
    ...options,
    timeZone: 'UTC',
  });
}

/** The clock time of a slot, in the zone the vet set their hours in. */
function timeOf(at: string): string {
  return new Date(at).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}

const DAY_TAB =
  'flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-xs font-bold transition';
const DAY_ON = 'border-teal-700 bg-teal-800 text-white';
const DAY_OFF = 'border-slate-200 bg-white text-slate-700 hover:border-teal-700';

const SLOT = 'rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed';
const SLOT_FREE = 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50';
const SLOT_ON = 'border-teal-700 bg-teal-800 text-white';
const SLOT_TAKEN = 'border-slate-200 bg-slate-100 text-slate-400 line-through';

/**
 * Step three: which slot.
 *
 * A day strip and then the times on that day. The whole fortnight is fetched at once
 * rather than a day at a time, so moving between days is instant and the strip can show
 * which days have nothing at all — a vet who works Tuesdays only should be visibly a
 * vet who works Tuesdays only, rather than a series of empty answers.
 *
 * A taken slot is rendered disabled rather than hidden. A full day that showed nothing
 * would read as a vet who does not work that day, which is a different fact.
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
        <div role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <p>Their diary would not load.</p>
          <button
            type="button"
            onClick={() => void grid.refetch()}
            className="mt-1 font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {days.length > 0 && (
        <>
          <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((day) => {
              const free = day.slots.filter((slot) => !slot.taken).length;

              return (
                <li key={day.date}>
                  <button
                    type="button"
                    onClick={() => setDate(day.date)}
                    aria-pressed={date === day.date}
                    className={`${DAY_TAB} ${date === day.date ? DAY_ON : DAY_OFF}`}
                  >
                    <span>{label(day.date, { weekday: 'short' })}</span>
                    <span className="text-base font-black">
                      {label(day.date, { day: 'numeric' })}
                    </span>
                    {/* The count rather than a dot: "3 free" is the thing somebody is
                        scanning the strip for. */}
                    <span
                      className={`text-[11px] font-semibold ${
                        date === day.date ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {free > 0 ? `${free} free` : '—'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {chosen && chosen.slots.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Nothing on {label(chosen.date, { weekday: 'long', day: 'numeric', month: 'long' })}.
              Try another day.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {chosen?.slots.map((slot) => (
                <li key={slot.at}>
                  <button
                    type="button"
                    disabled={slot.taken}
                    onClick={() => onPick(slot.at)}
                    aria-pressed={value === slot.at}
                    // Said out loud, because the strike-through and the grey are not
                    // available to a screen reader.
                    aria-label={slot.taken ? `${timeOf(slot.at)}, already taken` : timeOf(slot.at)}
                    className={`${SLOT} w-full ${
                      slot.taken ? SLOT_TAKEN : value === slot.at ? SLOT_ON : SLOT_FREE
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
