import { NavLink, Outlet } from 'react-router-dom';

import { HEADING, LEDE, TAB, TAB_ITEM, TAB_OFF, TAB_ON, TAB_RAIL } from '../_components/ui';

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
        <h2 className={HEADING}>User management</h2>
        <p className={`mt-1 ${LEDE}`}>
          Roles and access for every account, and the professionals among them.
        </p>
      </div>

      <nav aria-label="User management views">
        <ul className={TAB_RAIL}>
          {TABS.map((tab) => (
            <li key={tab.to} className={TAB_ITEM}>
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
