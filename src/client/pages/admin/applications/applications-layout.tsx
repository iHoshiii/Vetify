import { useMetricsBreakdown } from '@/hooks/useAdminMetrics';
import { NavLink, Outlet } from 'react-router-dom';

import { StatCard, StatCardSkeleton } from '../_components/stat-card';
import {
  FRAME,
  HEADING,
  LEDE,
  TAB,
  TAB_BADGE,
  TAB_BADGE_OFF,
  TAB_BADGE_ON,
  TAB_ITEM,
  TAB_OFF,
  TAB_ON,
  TAB_RAIL,
} from '../_components/ui';

/**
 * The phases, in the order somebody moves through them.
 *
 * Routes rather than local state, so a phase is a link that can be sent and each one
 * keeps its own filters and page in the address bar. `waiting` names the figure that
 * belongs on the tab as a badge — only the two queues have one, because the tabs after
 * them are outcomes rather than work: nobody is waiting on the directory, on a refusal,
 * on an archive, or on a chart.
 *
 * Statistics sits last, after the pipeline it describes. It is the one tab that is not
 * a list of people, which is why it is not in the run of five that are.
 */
const TABS = [
  { to: '/admin/applications', label: 'Request', end: true, waiting: 'request' },
  { to: '/admin/applications/application', label: 'Application', end: false, waiting: 'review' },
  { to: '/admin/applications/accepted', label: 'Accepted', end: false, waiting: null },
  { to: '/admin/applications/rejected', label: 'Rejected', end: false, waiting: null },
  { to: '/admin/applications/completed', label: 'Completed', end: false, waiting: null },
  { to: '/admin/applications/statistics', label: 'Statistics', end: false, waiting: null },
] as const;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * A licence application, from the first few lines somebody writes in with to a
 * listing in the directory.
 *
 * One section rather than six, because it is one journey: an enquiry earns an
 * emailed link, the link earns an application, and a verdict on that application
 * earns the role and the listing. Splitting the phases across the sidebar made an
 * admin navigate between several views of the same person.
 *
 * Two queues, three outcomes, and the shape of all of it. The split is what an admin is
 * being asked for: the first two tabs owe somebody a decision, the next three are the
 * record of decisions already made — Completed being both endings in one list, for
 * looking something up rather than acting on it — and Statistics is the pipeline in
 * aggregate rather than any row in it.
 *
 * The three figures stay here, above the tabs, rather than moving to Statistics with
 * the charts. They are the count of what is waiting, which is the one thing a reviewer
 * wants in front of them on whichever queue they are working. A chart is something
 * somebody opens a tab to go and read; a backlog is something they need told.
 */
export default function AdminApplicationsLayout() {
  const enquiries = useMetricsBreakdown('inquiryStatus');
  const applications = useMetricsBreakdown('professionalStatus');

  /** One slice by name, or zero. An absent slice means nothing is in that status. */
  function counted(breakdown: typeof enquiries, status: string): number {
    return breakdown.data?.slices.find((slice) => slice.label === status)?.count ?? 0;
  }

  const request = counted(enquiries, 'pending');
  // Both statuses a reviewer still owes a verdict on: an application being talked
  // about is no less waiting than one nobody has opened.
  const review = counted(applications, 'pending') + counted(applications, 'interview');
  const listed = counted(applications, 'verified');

  const badges: Record<string, number> = { request, review };
  const pending = enquiries.isPending || applications.isPending;
  const failed = enquiries.isError || applications.isError;

  return (
    <div className="space-y-5">
      <div>
        <h2 className={HEADING}>Professional applications</h2>
        <p className={`mt-1 ${LEDE}`}>
          The two queues a vet passes through — the enquiry they write in with, and the application
          the emailed link opens — and where each one ended up.
        </p>
      </div>

      {failed ? (
        // Said once rather than as three broken tiles. The figures come from one pair of
        // reads, so they fail together, and the queues below are unaffected by it.
        <p role="alert" className={`${FRAME} p-5 text-sm`}>
          <span className="font-semibold text-slate-700">
            {messageOf(enquiries.error ?? applications.error)}
          </span>{' '}
          <span className="text-slate-600">
            The counts are unavailable. The queues below still read live.
          </span>
        </p>
      ) : (
        <dl
          className={`grid gap-4 sm:grid-cols-3 ${
            enquiries.isFetching || applications.isFetching ? 'opacity-60' : ''
          }`}
        >
          {pending ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Awaiting a link"
                value={request}
                hint={`${counted(enquiries, 'invited')} invited, ${counted(
                  enquiries,
                  'declined'
                )} rejected`}
              />
              <StatCard
                label="Awaiting a verdict"
                value={review}
                hint={`${counted(applications, 'interview')} at interview, ${counted(
                  applications,
                  'rejected'
                )} turned down`}
              />
              <StatCard
                label="In the directory"
                value={listed}
                hint={`${counted(applications, 'suspended')} suspended`}
              />
            </>
          )}
        </dl>
      )}

      <nav aria-label="Application phases">
        <ul className={TAB_RAIL}>
          {TABS.map((tab) => (
            <li key={tab.to} className={TAB_ITEM}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `${TAB} ${isActive ? TAB_ON : TAB_OFF}`}
              >
                {/* A render prop rather than plain children, so the badge can be told
                    whether its own tab is the selected one — amber on a white rail, a
                    light wash on the deep green of the active tab. */}
                {({ isActive }) => (
                  <>
                    {tab.label}
                    {/* Absent rather than zero: "0" is a badge asking for attention it
                        does not need. */}
                    {tab.waiting && (badges[tab.waiting] ?? 0) > 0 && (
                      <span className={`${TAB_BADGE} ${isActive ? TAB_BADGE_ON : TAB_BADGE_OFF}`}>
                        {badges[tab.waiting]}
                      </span>
                    )}
                  </>
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
