import type { WeeklyScheduleItem } from '@shared/schemas';

const DAYS = [
  ['Monday', 'Mon'],
  ['Tuesday', 'Tue'],
  ['Wednesday', 'Wed'],
  ['Thursday', 'Thu'],
  ['Friday', 'Fri'],
  ['Saturday', 'Sat'],
  ['Sunday', 'Sun'],
] as const;

// The seven-day hours grid, one editable row per day, reused by the onsite and virtual schedules
export default function ScheduleGrid({
  schedule,
  onEdit,
}: {
  schedule: WeeklyScheduleItem[];
  onEdit: (day: string, change: Partial<WeeklyScheduleItem>) => void;
}) {
  return (
    <ul className="grid min-w-0 gap-2 md:grid-cols-2 2xl:grid-cols-3">
      {DAYS.map(([day, short]) => {
        const item = schedule.find((one) => one.day === day);
        if (!item) return null;

        return (
          <li
            key={day}
            className={`flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 ${
              item.enabled ? '' : 'bg-slate-50'
            }`}
          >
            <label className="flex w-20 shrink-0 items-center gap-2">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={() => onEdit(day, { enabled: !item.enabled })}
                className="h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
              />
              <span
                className={`text-xs font-bold ${
                  item.enabled ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {short}
              </span>
            </label>

            {item.enabled ? (
              <span className="flex min-w-0 basis-full items-center gap-2">
                <input
                  type="time"
                  value={item.startTime}
                  onChange={(event) => onEdit(day, { startTime: event.target.value })}
                  className="min-h-11 min-w-0 w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-base sm:text-sm font-semibold"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="time"
                  value={item.endTime}
                  onChange={(event) => onEdit(day, { endTime: event.target.value })}
                  className="min-h-11 min-w-0 w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-base sm:text-sm font-semibold"
                />
              </span>
            ) : (
              <span className="flex-1 text-xs italic text-slate-400">Closed</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
