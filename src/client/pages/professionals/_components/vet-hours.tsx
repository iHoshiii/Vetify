import type { ProfessionalAddressKind, WeeklyScheduleItem } from '@shared/schemas';

// The fields either profile shape shares, so the vet's own preview and the public page render hours the same way
type HoursVet = {
  addresses: { kind: ProfessionalAddressKind }[];
  onsiteSchedule: WeeklyScheduleItem[];
  virtualSchedule: WeeklyScheduleItem[];
};

// In the order a week runs, rather than the order the vet happened to save them in.
const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// One kind's week, closed days included so "Closed on Sunday" is answered rather than left to guess
function DayList({ schedule }: { schedule: WeeklyScheduleItem[] }) {
  return (
    <dl className="grid gap-1.5 text-sm">
      {WEEK.map((day) => {
        const entry = schedule.find((item) => item.day === day);
        const open = entry?.enabled ? `${entry.startTime} to ${entry.endTime}` : 'Closed';

        return (
          <div key={day} className="flex justify-between gap-4">
            <dt className="text-slate-600">{day}</dt>
            <dd className={entry?.enabled ? 'font-semibold text-slate-900' : 'text-slate-400'}>
              {open}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// The hours a vet keeps, split by the kinds they actually offer so clinic and online can differ
export default function VetHours({ vet }: { vet: HoursVet }) {
  const blocks = [
    vet.addresses.some((address) => address.kind === 'clinic') && {
      label: 'Clinic visit',
      schedule: vet.onsiteSchedule,
    },
    vet.addresses.some((address) => address.kind === 'home') && {
      label: 'Online',
      schedule: vet.virtualSchedule,
    },
  ].filter(Boolean) as { label: string; schedule: WeeklyScheduleItem[] }[];

  if (!blocks.some((block) => block.schedule.length > 0)) {
    return (
      <p className="text-sm text-slate-600">
        They have not published their hours. Ask for a time and they will say if it does not suit.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {blocks.map((block) => (
        <div key={block.label}>
          {blocks.length > 1 && (
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              {block.label}
            </p>
          )}
          <DayList schedule={block.schedule} />
        </div>
      ))}
    </div>
  );
}
