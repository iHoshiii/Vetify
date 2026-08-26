import { useMetricsBreakdown, useMetricsTimeseries } from '@/hooks/useAdminMetrics';
import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '@shared/schemas';

import { AccountsTable } from '../_components/accounts-table';
import { BreakdownChart } from '../_components/breakdown-chart';
import { MetricChart } from '../_components/metric-chart';
import { StatCard, StatCardSkeleton } from '../_components/stat-card';

/** The window the signups line covers. Fixed, unlike the overview's: this tab is
 * a list with a chart on it, not a chart with controls. */
const WINDOW_DAYS = 30;

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Users',
  professional: 'Professionals',
  admin: 'Admins',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * One tab of accounts: the numbers for them, then the list of them.
 *
 * `role` is what the tab is about. Undefined means every account, which is the
 * landing tab and the only one that offers the Role filter — a tab that has
 * already fixed its role cannot also let somebody contradict it.
 *
 * The tiles are counted with the same role the table lists, so "Suspended" above
 * a list of professionals is a count of suspended professionals and not of every
 * suspended account. The signups line is the one figure here that is not
 * role-aware — activity events carry no role — so it is only drawn on the tab
 * that is about every account, where it is true.
 */
export default function AccountsTab({ role }: { role?: UserRole }) {
  const fixed = role !== undefined;
  const { get } = useAdminListParams();

  // Either the role this tab is for, or whatever its Role filter has been set to.
  const shown = role ?? pick(get('role'), USER_ROLES);

  useDocumentTitle(
    `Admin ${shown ? ROLE_LABEL[shown].toLowerCase() : 'accounts'}`,
    'Accounts, roles and access.'
  );

  const statuses = useMetricsBreakdown('userStatus', shown);
  const providers = useMetricsBreakdown('provider', shown);
  const signups = useMetricsTimeseries('signups', WINDOW_DAYS);

  function counted(status: UserStatus): number {
    return statuses.data?.slices.find((slice) => slice.label === status)?.count ?? 0;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        {fixed
          ? 'Verifying and suspending a directory listing happens under Applications. This tab is the account behind it.'
          : 'Suspending or banning signs the account out everywhere. Nothing here deletes anybody.'}
      </p>

      <dl
        className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${
          statuses.isFetching ? 'opacity-60' : ''
        }`}
      >
        {statuses.isPending || !statuses.data ? (
          Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              label={shown ? ROLE_LABEL[shown] : 'All accounts'}
              value={statuses.data.total}
            />
            {USER_STATUSES.map((status) => (
              <StatCard key={status} label={status} value={counted(status)} />
            ))}
          </>
        )}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownChart
          label="By sign-in method"
          slices={providers.data?.slices ?? []}
          total={providers.data?.total ?? 0}
          isPending={providers.isPending}
          error={providers.isError ? messageOf(providers.error) : null}
          onRetry={() => void providers.refetch()}
        />

        {/* Only on the every-account tab, because that is the only tab it is a
            true statement about. */}
        {!fixed && (
          <MetricChart
            label={`Signups, last ${WINDOW_DAYS} days`}
            points={signups.data?.points ?? []}
            isPending={signups.isPending}
            isFetching={signups.isFetching}
            error={signups.isError ? messageOf(signups.error) : null}
            onRetry={() => void signups.refetch()}
          />
        )}
      </div>

      <AccountsTable role={shown} roleFilter={!fixed} />
    </div>
  );
}
