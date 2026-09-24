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
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {DAYS.map(([day, short]) => {
        const item = schedule.find((one) => one.day === day);
        if (!item) return null;

        return (
          <li
            key={day}
            className={`flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 ${
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
              <span className="flex flex-1 items-center gap-1">
                <input
                  type="time"
                  value={item.startTime}
                  onChange={(event) => onEdit(day, { startTime: event.target.value })}
                  className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="time"
                  value={item.endTime}
                  onChange={(event) => onEdit(day, { endTime: event.target.value })}
                  className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
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
