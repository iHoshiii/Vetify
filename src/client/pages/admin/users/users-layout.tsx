import { NavLink, Outlet } from 'react-router-dom';

/**
 * The two views of the same people.
 *
 * Accounts first because it is every account and the landing, then the role with a
 * directory listing attached. Routes rather than local state, so a tab is a link
 * somebody can send and each one keeps its own filters in the address bar.
 *
 * The queues that grant that role used to be two more tabs here. They are their own
 * section now: an enquiry becoming an application becoming a listing is a journey
 * with an outcome, not another way of looking at an account.
 */
const TABS = [
  { to: '/admin/users', label: 'Accounts', end: true },
  { to: '/admin/users/professionals', label: 'Professionals', end: false },
] as const;

const TAB = 'rounded-md px-3 py-1.5 text-sm font-bold transition-colors';
const TAB_ON = 'bg-teal-900 text-white';
const TAB_OFF = 'text-slate-600 hover:bg-teal-900/5 hover:text-teal-900';

/**
 * User management: every account, and the professionals among them.
 *
 * One section rather than two in the sidebar, because the second is a narrowing of the
 * first — a directory listing hangs off a role, and the account underneath is what
 * gets suspended when something goes wrong with either. What grants that role in the
 * first place is next door, under Applications.
 */
export default function AdminUsersLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">User management</h2>
        <p className="mt-1 text-sm text-slate-600">
          Roles and access for every account, and the professionals among them.
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
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
