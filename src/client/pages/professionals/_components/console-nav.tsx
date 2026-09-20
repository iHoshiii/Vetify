import { useIncomingAppointmentCounts } from '@/hooks/useAppointments';
import type { AppointmentKind } from '@shared/schemas';
import { NavLink } from 'react-router-dom';

const ROOT = '/professionals/dashboard';

// The two booking sections carry a count; the rest are pages you open rather than queues you clear
const SECTIONS: ReadonlyArray<{ to: string; label: string; kind?: AppointmentKind }> = [
  { to: `${ROOT}/consultations`, label: 'Online Consultation', kind: 'virtual' },
  { to: `${ROOT}/clinic-visits`, label: 'Clinic Visit', kind: 'onsite' },
  { to: `${ROOT}/conversations`, label: 'Conversations' },
  { to: `${ROOT}/history`, label: 'History & Logs' },
  { to: `${ROOT}/settings`, label: 'Settings' },
];

const LINK =
  'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors hover:bg-teal-900/5 hover:text-teal-900';
const ACTIVE = 'bg-teal-900 text-white hover:bg-teal-900 hover:text-white';
const IDLE = 'text-slate-600';
const COUNT = 'rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white';

export default function ConsoleNav() {
  const { data: counts } = useIncomingAppointmentCounts();

  return (
    <nav aria-label="Console sections" className="lg:w-48 lg:shrink-0">
      {/* Scrolls sideways under lg, stacks above it. */}
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
        {SECTIONS.map((section) => {
          const waiting = section.kind ? counts?.[section.kind].requested ?? 0 : 0;

          return (
            <li key={section.to} className="shrink-0 lg:shrink">
              <NavLink
                to={section.to}
                className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : IDLE}`}
              >
                <span className="whitespace-nowrap">{section.label}</span>
                {waiting > 0 && (
                  <span className={COUNT} aria-label={`${waiting} waiting on you`}>
                    {waiting}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
