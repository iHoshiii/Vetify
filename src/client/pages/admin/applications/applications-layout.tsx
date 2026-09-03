import { NavLink, Outlet } from 'react-router-dom';

import { HEADING, TAB, TAB_ITEM, TAB_OFF, TAB_ON, TAB_RAIL } from '../_components/ui';

/** The five phases of the application pipeline. Aggregate statistics live in the
 * admin sidebar as their own workspace. */
const TABS = [
  { to: '/admin/applications', label: 'Request', end: true },
  { to: '/admin/applications/application', label: 'Application', end: false },
  { to: '/admin/applications/accepted', label: 'Accepted', end: false },
  { to: '/admin/applications/rejected', label: 'Rejected', end: false },
  { to: '/admin/applications/completed', label: 'Completed', end: false },
] as const;

/** Shared shell for the application queues and their outcome views. */
export default function AdminApplicationsLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className={HEADING}>Professional applications</h2>
      </div>

      <nav aria-label="Application phases">
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
