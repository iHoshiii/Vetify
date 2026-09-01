import { useAuth } from '@/components/providers/AuthProvider';
import { useAdminListParams, pick } from '@/hooks/useAdminListParams';
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from '@/hooks/useAdminUsers';
import type { AdminUser } from '@/services/admin.service';
import {
  ADMIN_USER_SORTS,
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { ConfirmDialog, type ReasonMode } from './confirm-dialog';
import { DataTable, type Column } from './data-table';
import { FilterSelect, ListToolbar, SearchBox } from './list-toolbar';
import { RoleBadge } from './role-badge';
import { StatusBadge } from './status-badge';

/**
 * A decision waiting on a confirmation.
 *
 * Role and status changes share one dialog because they share everything that
 * matters about it — a target, a reason, and a server that can refuse.
 */
type Pending =
  | { kind: 'role'; user: AdminUser; role: UserRole }
  | { kind: 'status'; user: AdminUser; status: UserStatus };

const ACTION =
  'inline-flex items-center justify-center rounded-md border border-forest-200 bg-white px-2.5 py-1 text-xs font-bold text-forest-700 transition-colors hover:border-forest-400 hover:bg-forest-50 disabled:cursor-not-allowed disabled:opacity-40';

/** Reinstating needs no justification; taking access away does. */
const STATUS_REASON: Record<UserStatus, ReasonMode> = {
  active: 'optional',
  suspended: 'required',
  banned: 'required',
};

const STATUS_COPY: Record<UserStatus, { verb: string; blurb: string }> = {
  active: { verb: 'Reinstate', blurb: 'They can sign in again straight away.' },
  suspended: {
    verb: 'Suspend',
    blurb: 'Signs them out everywhere and blocks sign-in until you reinstate them. Reversible.',
  },
  banned: {
    verb: 'Ban',
    blurb: 'Signs them out everywhere and blocks sign-in. The account and its data stay.',
  },
};

function joined(date: string): string {
  return format(parseISO(date), 'd MMM yyyy');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

type AccountsTableProps = {
  /**
   * Which role to list, resolved by the tab above — either the role that tab
   * fixes, or whatever its Role filter is set to. Undefined lists every role.
   */
  role: UserRole | undefined;
  /**
   * Whether to offer the Role filter. A tab that fixes a role hides it: a control
   * able to contradict the tab it sits under is not a filter.
   */
  roleFilter: boolean;
};

/**
 * Accounts: who they are, what they may do, and whether they may sign in.
 *
 * Every action goes through the confirm dialog rather than a bare click, because
 * three of them end somebody's session and one of them hands out the keys to this
 * page. The dialog also happens to be where a 409 from the server belongs — the
 * guards that refuse self-demotion and the last admin answer there, in front of
 * the person who tried it, with their typed reason still in the box.
 *
 * Shared by both account tabs rather than copied into each. The guards, the dialog
 * copy and the "and four sessions were signed out" line are precisely the parts
 * that must not come to differ between two lists of accounts.
 */
export function AccountsTable({ role, roleFilter }: AccountsTableProps) {
  const { user: me } = useAuth();
  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);
  const rawDays = get('days');
  const days: 7 | 30 | 90 | undefined =
    rawDays === '7' ? 7 : rawDays === '30' ? 30 : rawDays === '90' ? 90 : undefined;

  const params = {
    page,
    limit: 20,
    days,
    q: get('q'),
    role,
    status: pick(get('status'), USER_STATUSES),
    provider: pick(get('provider'), AUTH_PROVIDERS),
    sort: pick(get('sort'), ADMIN_USER_SORTS),
  };

  const list = useAdminUsers(params);
  const changeRole = useUpdateUserRole();
  const changeStatus = useUpdateUserStatus();
  const active = pending?.kind === 'role' ? changeRole : changeStatus;

  /**
   * Opening clears the last result, closing does not.
   *
   * Which is deliberate: the confirmation line under the table is the only place
   * "and four sessions were signed out" gets said, and resetting on close would
   * wipe it in the same tick the dialog disappeared.
   */
  function open(next: Pending): void {
    changeRole.reset();
    changeStatus.reset();
    setPending(next);
  }

  function close(): void {
    setPending(null);
  }

  function confirm(reason: string | null): void {
    if (!pending) return;

    const done = { onSuccess: () => close() };

    if (pending.kind === 'role') {
      changeRole.mutate(
        { id: pending.user.id, role: pending.role, ...(reason ? { reason } : {}) },
        done
      );
      return;
    }

    changeStatus.mutate(
      { id: pending.user.id, status: pending.status, ...(reason ? { reason } : {}) },
      done
    );
  }

  const columns: Column<AdminUser>[] = [
    {
      header: 'Account',
      sorts: [{ token: 'email', direction: 'ascending' }],
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-950">{row.name ?? 'No name'}</p>
          <p className="truncate text-xs text-slate-500">{row.email}</p>
          {/* Says why they are suspended, where somebody is looking anyway. */}
          {row.statusReason && (
            <p className="mt-1 text-xs font-semibold text-rose-700">{row.statusReason}</p>
          )}
        </div>
      ),
    },
    { header: 'Role', cell: (row) => <RoleBadge role={row.role} /> },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Sign-in',
      secondary: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.provider}
          {!row.emailVerified && row.provider === 'local' && (
            <span className="ml-1.5 text-amber-700">unverified</span>
          )}
        </span>
      ),
    },
    {
      header: 'Joined',
      secondary: true,
      sorts: [
        { token: 'newest', direction: 'descending' },
        { token: 'oldest', direction: 'ascending' },
      ],
      cell: (row) => <span className="text-xs text-slate-600">{joined(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => {
        // The server refuses both of these with a 409 anyway. Disabling them here
        // is so nobody has to discover that by trying it on their own account.
        const isSelf = row.id === me?.id;

        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            {USER_ROLES.filter((option) => option !== row.role && option !== 'professional').map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  disabled={isSelf}
                  title={isSelf ? 'You cannot change your own role.' : undefined}
                  onClick={() => open({ kind: 'role', user: row, role: option })}
                  className={ACTION}
                >
                  Make {option}
                </button>
              )
            )}

            {USER_STATUSES.filter((status) => status !== row.status).map((status) => (
              <button
                key={status}
                type="button"
                disabled={isSelf}
                title={isSelf ? 'You cannot change your own access.' : undefined}
                onClick={() => open({ kind: 'status', user: row, status })}
                className={`${ACTION} ${status === 'banned' ? 'text-rose-700' : ''}`}
              >
                {STATUS_COPY[status].verb}
              </button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <ListToolbar>
        <SearchBox
          label="Search accounts"
          value={get('q')}
          placeholder="Name or email"
          live
          onSearch={(q) => set({ q })}
        />
        {roleFilter && (
          <FilterSelect
            label="Role"
            value={get('role')}
            options={USER_ROLES}
            onChange={(next) => set({ role: next })}
          />
        )}
        <FilterSelect
          label="Status"
          value={get('status')}
          options={USER_STATUSES}
          onChange={(status) => set({ status })}
        />
        <FilterSelect
          label="Sign-in"
          value={get('provider')}
          options={AUTH_PROVIDERS}
          onChange={(provider) => set({ provider })}
        />
        <FilterSelect
          label="Signed up"
          value={days ? `${days} days` : undefined}
          options={['7 days', '30 days', '90 days']}
          allLabel="All Time"
          onChange={(value) =>
            set({
              days:
                value === '7 days'
                  ? 7
                  : value === '30 days'
                  ? 30
                  : value === '90 days'
                  ? 90
                  : undefined,
            })
          }
        />
      </ListToolbar>

      <DataTable<AdminUser>
        caption="Accounts"
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(row) => row.id}
        page={list.data?.page ?? page}
        pages={list.data?.pages ?? 1}
        total={list.data?.total ?? 0}
        limit={list.data?.limit ?? 20}
        onPage={(next) => set({ page: next })}
        sort={get('sort') ?? 'newest'}
        onSort={(sort) => set({ sort })}
        isPending={list.isPending}
        isFetching={list.isFetching}
        error={list.isError ? messageOf(list.error) : null}
        onRetry={() => void list.refetch()}
        empty="No accounts match those filters."
      />

      {pending && (
        <ConfirmDialog
          open
          title={
            pending.kind === 'role'
              ? `Make ${pending.user.email} a ${pending.role}?`
              : `${STATUS_COPY[pending.status].verb} ${pending.user.email}?`
          }
          description={
            pending.kind === 'role' ? (
              <>
                {pending.role === 'admin'
                  ? 'They get this console, including the power to change roles and ban accounts.'
                  : pending.role === 'professional'
                  ? 'They can write posts and appear in the directory.'
                  : 'They lose the professional directory listing and any admin access.'}{' '}
                Recorded in the audit log against your account.
              </>
            ) : (
              <>
                {STATUS_COPY[pending.status].blurb} Recorded in the audit log against your account.
              </>
            )
          }
          confirmLabel={
            pending.kind === 'role' ? `Make ${pending.role}` : STATUS_COPY[pending.status].verb
          }
          reason={pending.kind === 'role' ? 'optional' : STATUS_REASON[pending.status]}
          destructive={pending.kind === 'status' && pending.status !== 'active'}
          isPending={active.isPending}
          error={active.isError ? messageOf(active.error) : null}
          onCancel={close}
          onConfirm={confirm}
        />
      )}

      {/* Announced rather than shown as a toast: the number of sessions a ban
          killed is the part an admin cannot see for themselves. */}
      {changeStatus.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          {changeStatus.data.user.email} is now {changeStatus.data.statusTo}
          {changeStatus.data.sessionsRevoked > 0 &&
            `, and ${changeStatus.data.sessionsRevoked} session${
              changeStatus.data.sessionsRevoked === 1 ? '' : 's'
            } ${changeStatus.data.sessionsRevoked === 1 ? 'was' : 'were'} signed out`}
          .
        </p>
      )}

      {changeRole.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          {changeRole.data.user.email} went from {changeRole.data.roleFrom} to{' '}
          {changeRole.data.roleTo}.
        </p>
      )}
    </div>
  );
}
