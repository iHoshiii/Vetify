import { useMetricsBreakdown, useMetricsTimeseries } from '@/hooks/useAdminMetrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useState } from 'react';

import { BreakdownChart } from '../_components/breakdown-chart';
import { MetricChart } from '../_components/metric-chart';
import { CHIP, CHIP_OFF, CHIP_ON, LEDE, MUTED, PANEL_HEADING } from '../_components/ui';

/**
 * A week, a month, a quarter.
 *
 * 90 is the ceiling because that is how long raw activity events are kept — a longer
 * window would draw a line that is honest for 90 days and flat zero behind it.
 */
const WINDOWS = [7, 30, 90] as const;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * The pipeline in aggregate: how much arrives, and where it all ends up.
 *
 * Its own tab rather than a strip of charts under whichever queue happened to be
 * open, which is where these two lived. A chart is read deliberately — you go to it
 * with a question — and putting them under the queues meant every reviewer scrolled
 * past them to reach a pager, and read them by accident or not at all.
 *
 * Both halves of the funnel are here, which is the thing the old pair could not show:
 * enquiries by status beside applications by status is where an admin sees that the
 * enquiry queue is being worked and the application queue is not, or that the two are
 * out of step. The layout says the same thing — the two breakdowns sit side by side
 * because they are meant to be compared, and the arrival line runs the full width
 * beneath them because time is the axis that needs the room.
 *
 * The window drives the line only. A breakdown is the shape of what exists right now
 * and has no span to be measured over: "applications by status in the last 7 days"
 * would be a different question, and one this endpoint does not answer.
 */
export default function StatisticsTab() {
  useDocumentTitle('Admin application statistics', 'How the licence pipeline is moving.');

  const [days, setDays] = useState<number>(30);

  const enquiries = useMetricsBreakdown('inquiryStatus');
  const applications = useMetricsBreakdown('professionalStatus');
  const filed = useMetricsTimeseries('applications', days);

  return (
    <div className="space-y-6">
      <p className={LEDE}>
        Where every enquiry and every application currently sits, and how many have been filed
        lately. Read the two splits together — a deep enquiry queue beside an empty application one
        means invitations are going out and not coming back.
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownChart
          label="Enquiries by status"
          slices={enquiries.data?.slices ?? []}
          total={enquiries.data?.total ?? 0}
          isPending={enquiries.isPending}
          isFetching={enquiries.isFetching}
          error={enquiries.isError ? messageOf(enquiries.error) : null}
          onRetry={() => void enquiries.refetch()}
        />
        <BreakdownChart
          label="Applications by status"
          slices={applications.data?.slices ?? []}
          total={applications.data?.total ?? 0}
          isPending={applications.isPending}
          isFetching={applications.isFetching}
          error={applications.isError ? messageOf(applications.error) : null}
          onRetry={() => void applications.refetch()}
        />
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={PANEL_HEADING}>Applications filed</h3>

          {/* A group rather than tabs: this switches the span of one chart, it does not
              navigate. `aria-pressed` is what says which is on. */}
          <div role="group" aria-label="Window" className="flex gap-1">
            {WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setDays(window)}
                aria-pressed={days === window}
                className={`${CHIP} ${days === window ? CHIP_ON : CHIP_OFF}`}
              >
                {window} days
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <MetricChart
            label={`Applications filed, last ${days} days`}
            points={filed.data?.points ?? []}
            isPending={filed.isPending}
            isFetching={filed.isFetching}
            error={filed.isError ? messageOf(filed.error) : null}
            onRetry={() => void filed.refetch()}
          />
        </div>

        <p className={`mt-2 ${MUTED}`}>
          Counted from activity events, which are kept for 90 days — a line that stops at the left
          edge is that retention window, not a quiet fortnight. The two splits above are counted
          from the rows themselves and go back as far as the records do.
        </p>
      </section>
    </div>
  );
}
