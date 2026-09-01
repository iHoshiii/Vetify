import { useMetricsBreakdown, useMetricsTimeseries } from '@/hooks/useAdminMetrics';
import { NavLink, Outlet } from 'react-router-dom';

import { BreakdownChart } from '../_components/breakdown-chart';
import { MetricChart } from '../_components/metric-chart';
import { StatCard, StatCardSkeleton } from '../_components/stat-card';

/**
 * The phases, in the order somebody moves through them.
 *
 * Routes rather than local state, so a phase is a link that can be sent and each one
 * keeps its own filters and page in the address bar. `waiting` names the figure that
 * belongs on the tab as a badge — only the two queues have one, because the tabs after
 * them are outcomes rather than work: nobody is waiting on the directory, on a refusal,
 * or on an archive.
 */
const TABS = [
  { to: '/admin/applications', label: 'Request', end: true, waiting: 'request' },
  { to: '/admin/applications/application', label: 'Application', end: false, waiting: 'review' },
  { to: '/admin/applications/accepted', label: 'Accepted', end: false, waiting: null },
  { to: '/admin/applications/rejected', label: 'Rejected', end: false, waiting: null },
  { to: '/admin/applications/completed', label: 'Completed', end: false, waiting: null },
] as const;

const TAB = 'rounded-md px-3 py-1.5 text-sm font-bold transition-colors';
const TAB_ON = 'bg-teal-900 text-white';
const TAB_OFF = 'text-slate-600 hover:bg-teal-900/5 hover:text-teal-900';

/** The window the filed line covers, matching the other admin charts. */
const WINDOW_DAYS = 30;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * A licence application, from the first few lines somebody writes in with to a
 * listing in the directory.
 *
 * One section rather than five, because it is one journey: an enquiry earns an
 * emailed link, the link earns an application, and a verdict on that application
 * earns the role and the listing. Splitting the phases across the sidebar made an
 * admin navigate between several views of the same person.
 *
 * Two queues and three outcomes. The split is what an admin is being asked for: the
 * first two tabs owe somebody a decision, the last three are the record of decisions
 * already made — and Completed is both endings in one list, for looking something up
 * rather than acting on it.
 *
 * The figures and both charts live here rather than on a tab. They describe the
 * pipeline as a whole — where the queue is deep, and whether anything is arriving at
 * all — and a reviewer reading the Request queue has the same use for them as one
 * reading Application.
 */
export default function AdminApplicationsLayout() {
  const enquiries = useMetricsBreakdown('inquiryStatus');
  const applications = useMetricsBreakdown('professionalStatus');
  const filed = useMetricsTimeseries('applications', WINDOW_DAYS);

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">Professional applications</h2>
        <p className="mt-1 text-sm text-slate-600">
          The two queues a vet passes through — the enquiry they write in with, and the application
          the emailed link opens — and where each one ended up.
        </p>
      </div>

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
              )} declined`}
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

      <nav aria-label="Application phases">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((tab) => (
            <li key={tab.to} className="shrink-0">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `${TAB} ${isActive ? TAB_ON : TAB_OFF}`}
              >
                {tab.label}
                {/* Absent rather than zero: "0" is a badge asking for attention it does
                    not need. */}
                {tab.waiting && badges[tab.waiting] > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[11px] font-black text-amber-900">
                    {badges[tab.waiting]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownChart
          label="Applications by status"
          variant="bar"
          slices={applications.data?.slices ?? []}
          total={applications.data?.total ?? 0}
          isPending={applications.isPending}
          error={applications.isError ? messageOf(applications.error) : null}
          onRetry={() => void applications.refetch()}
        />
        <MetricChart
          label={`Applications filed, last ${WINDOW_DAYS} days`}
          points={filed.data?.points ?? []}
          isPending={filed.isPending}
          isFetching={filed.isFetching}
          error={filed.isError ? messageOf(filed.error) : null}
          onRetry={() => void filed.refetch()}
        />
      </div>
    </div>
  );
}
