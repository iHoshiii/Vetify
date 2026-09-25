import { useProfessionalSlots } from '@/hooks/useProfessionals';
import type { AppointmentKind } from '@shared/schemas';
import { useMemo, useState } from 'react';

import DaySlots from './day-slots';
import ErrorNote from './error-note';
import MonthCalendar from './month-calendar';
import type { Run } from './slot-span';
import { manilaToday, monthEnd, monthKeyOf } from './slot-time';

/**
 * Step three: which hours. A calendar pages by month with no far end, so any future
 * working day is bookable; a tap on a day opens its hours, and a tap on an hour adds
 * or removes it in any order — a run in a row is one visit, hours apart are separate.
 */
export default function SlotPicker({
  professionalId,
  kind,
  onChoose,
}: {
  professionalId: string;
  kind: AppointmentKind;
  onChoose: (runs: Run[]) => void;
}) {
  const today = useMemo(() => manilaToday(), []);
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const [date, setDate] = useState(today);
  const [picked, setPicked] = useState<string[]>([]);

  const grid = useProfessionalSlots({
    id: professionalId,
    from: `${month}-01`,
    to: monthEnd(month),
    kind,
  });

  const minutes = grid.data?.minutes ?? 60;
  const days = grid.data?.days ?? [];
  const chosen = days.find((day) => day.date === date);

  // A new month may not hold the picked day, and hours across days are separate visits anyway.
  function goToMonth(next: string): void {
    setMonth(next);
    setDate('');
    setPicked([]);
  }

  function goToDay(next: string): void {
    setDate(next);
    setPicked([]);
  }

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pick your hours</p>

      {grid.isPending && <p className="mt-3 text-sm text-slate-600">Reading their diary…</p>}

      {grid.isError && (
        <ErrorNote message="Their diary would not load." onRetry={() => void grid.refetch()} />
      )}

      {grid.data && (
        <>
          <MonthCalendar
            month={month}
            today={today}
            days={days}
            value={date}
            onMonth={goToMonth}
            onPick={goToDay}
          />
          <DaySlots
            day={chosen}
            minutes={minutes}
            picked={picked}
            onToggle={setPicked}
            onChoose={onChoose}
          />
        </>
      )}
    </div>
  );
}
