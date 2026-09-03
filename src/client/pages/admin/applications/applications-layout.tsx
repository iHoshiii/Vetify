import { useAdminInquiries } from '@/hooks/useAdminInquiries';
import { useAdminProfessionals } from '@/hooks/useAdminProfessionals';
import { NavLink, Outlet } from 'react-router-dom';

import {
  HEADING,
  TAB,
  TAB_BADGE,
  TAB_BADGE_OFF,
  TAB_BADGE_ON,
  TAB_ITEM,
  TAB_OFF,
  TAB_ON,
  TAB_RAIL,
  badgeOf,
} from '../_components/ui';

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
  // Only the two tabs that are queues. Accepted, Rejected and Completed are records of
  // what was already decided, and a count on those is a number nobody has to act on.
  const requests = useAdminInquiries({ status: 'pending', limit: 1 }).data?.total ?? 0;
  const filed =
    useAdminProfessionals({ status: ['pending', 'interview'], limit: 1 }).data?.total ?? 0;

  const COUNTS: Record<string, number> = {
    '/admin/applications': requests,
    '/admin/applications/application': filed,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className={HEADING}>Professional applications</h2>
      </div>

      <nav aria-label="Application phases">
        <ul className={TAB_RAIL}>
          {TABS.map((tab) => {
            const count = COUNTS[tab.to] ?? 0;

            return (
              <li key={tab.to} className={TAB_ITEM}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => `${TAB} ${isActive ? TAB_ON : TAB_OFF}`}
                >
                  {({ isActive }) => (
                    <>
                      {tab.label}
                      {count > 0 && (
                        <span className={`${TAB_BADGE} ${isActive ? TAB_BADGE_ON : TAB_BADGE_OFF}`}>
                          {badgeOf(count)}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
