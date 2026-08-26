import { useMetricsOverview } from '@/hooks/useAdminMetrics';
import { NavLink, Outlet } from 'react-router-dom';

/**
 * The three views of the same people.
 *
 * Accounts first because it is every account and the landing, then the role with a
 * directory listing attached, then the queue that has applicants waiting on a
 * decision. Routes rather than local state, so a tab is a link somebody can send
 * and each one keeps its own filters in the address bar.
 */
const TABS = [
  { to: '/admin/users', label: 'Accounts', end: true },
  { to: '/admin/users/professionals', label: 'Professionals', end: false },
  { to: '/admin/users/applications', label: 'Applications', end: false },
] as const;

const TAB = 'rounded-md px-3 py-1.5 text-sm font-bold transition-colors';
const TAB_ON = 'bg-teal-900 text-white';
const TAB_OFF = 'text-slate-600 hover:bg-teal-900/5 hover:text-teal-900';

/**
 * User management: the accounts, the professionals among them, and the
 * applications waiting on a verdict.
 *
 * One section rather than three, because they are one job — the queue decides a
 * role, the role decides a directory listing, and the account underneath is what
 * gets suspended when any of it goes wrong. Splitting them across the sidebar made
 * an admin navigate between the three halves of a single decision.
 */
export default function AdminUsersLayout() {
  const overview = useMetricsOverview();
  const pending = overview.data?.totals.pendingApplications ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">User management</h2>
        <p className="mt-1 text-sm text-slate-600">
          Roles and access for every account, and the applications that grant them.
        </p>
      </div>

      <nav aria-label="User management views">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((tab) => (
            <li key={tab.to} className="shrink-0">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `${TAB} ${isActive ? TAB_ON : TAB_OFF}`}
              >
                {tab.label}
                {/* The count is on the tab because it is the only one of the three
                    with anybody waiting on it. Absent rather than zero: "0" is a
                    badge asking for attention it does not need. */}
                {tab.label === 'Applications' && pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[11px] font-black text-amber-900">
                    {pending}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
