import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useAudit } from '@/hooks/useAdminAudit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AuditEntry } from '@/services/admin.service';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, type AuditAction } from '@shared/schemas';
import { format, parseISO } from 'date-fns';

import { DataTable, type Column } from './_components/data-table';
import { FilterSelect, ListToolbar, SearchBox } from './_components/list-toolbar';

/** Past tense, because that is what an audit entry is: something already done. */
const ACTION_LABEL: Record<AuditAction, string> = {
  'blog.approved': 'Cleared a held post',
  'blog.hidden': 'Hid a post',
  'blog.purged': 'Deleted a post for good',
  'blog.removed': 'Took a post down',
  'blog.restored': 'Restored a post',
  'professional.inquiry.declined': 'Declined an enquiry',
  'professional.interview': 'Booked an interview',
  'professional.invited': 'Sent an application link',
  'professional.verified': 'Verified an application',
  'professional.rejected': 'Rejected an application',
  'professional.suspended': 'Suspended a listing',
  'user.role.changed': 'Changed a role',
  'user.status.changed': 'Changed account access',
};

/** Rose for the ones that took something away. */
const ACTION_TONE: Partial<Record<AuditAction, string>> = {
  'blog.purged': 'text-rose-700',
  'blog.removed': 'text-rose-700',
  'blog.hidden': 'text-orange-700',
  'professional.inquiry.declined': 'text-rose-700',
  'professional.rejected': 'text-rose-700',
  'professional.suspended': 'text-rose-700',
};

function when(date: string): string {
  return format(parseISO(date), 'd MMM yyyy, HH:mm');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * The move an entry recorded, read out of its metadata.
 *
 * The metadata is deliberately open on the server — different actions carry
 * different fields — so this reads the two pairs that exist rather than assuming a
 * shape, and says nothing when neither is there.
 */
function movement(entry: AuditEntry): string | null {
  const from = entry.metadata.roleFrom ?? entry.metadata.statusFrom;
  const to = entry.metadata.roleTo ?? entry.metadata.statusTo;

  if (typeof from !== 'string' || typeof to !== 'string') return null;
  return `${from} \u2192 ${to}`;
}

/**
 * Everything an admin has done, newest first.
 *
 * Append-only and read-only — there is no mutation hook behind this page and no
 * endpoint behind one, because a trail somebody can edit answers no question. Rows
 * outlive their subjects on purpose: the actor's email is the address as it read at
 * the time, copied rather than joined, so an entry stays legible after the account
 * is renamed or gone.
 */
export default function AdminAuditPage() {
  useDocumentTitle('Admin audit log', 'Every privileged action, and who took it.');

  const { page, get, set } = useAdminListParams();

  const params = {
    page,
    action: pick(get('action'), AUDIT_ACTIONS),
    targetType: pick(get('targetType'), AUDIT_TARGET_TYPES),
    targetId: get('targetId'),
    actor: get('actor'),
  };

  const list = useAudit(params);

  const columns: Column<AuditEntry>[] = [
    {
      header: 'When',
      cell: (row) => (
        <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
          {when(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Who',
      cell: (row) => (
        <div className="min-w-0">
          {/* Null when the system did it to itself — the seed script granting the
              first admin, before there was an admin to attribute it to. */}
          <p className="truncate text-xs font-bold text-slate-950">{row.actorEmail ?? 'System'}</p>
          {row.ip && <p className="truncate text-[11px] text-slate-500">{row.ip}</p>}
        </div>
      ),
    },
    {
      header: 'Did',
      cell: (row) => (
        <div className="min-w-0">
          <p className={`text-xs font-bold ${ACTION_TONE[row.action] ?? 'text-slate-950'}`}>
            {ACTION_LABEL[row.action]}
          </p>
          {movement(row) && (
            <p className="text-[11px] font-semibold text-slate-500">{movement(row)}</p>
          )}
        </div>
      ),
    },
    {
      header: 'To',
      secondary: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => set({ targetId: row.targetId, targetType: row.targetType })}
          title="Show every entry for this record"
          className="font-mono text-[11px] text-teal-800 hover:underline"
        >
          {row.targetType} {row.targetId.slice(-8)}
        </button>
      ),
    },
    {
      header: 'Reason',
      secondary: true,
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.reason ?? <span className="text-slate-400">&mdash;</span>}
        </span>
      ),
    },
  ];

  const target = get('targetId');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">Audit log</h2>
        <p className="mt-1 text-sm text-slate-600">
          Append-only and kept indefinitely. Activity events age out after 90 days; these do not.
        </p>
      </div>

      <ListToolbar>
        <FilterSelect
          label="Action"
          value={get('action')}
          options={AUDIT_ACTIONS}
          onChange={(action) => set({ action })}
          allLabel="Every action"
        />
        <FilterSelect
          label="Record"
          value={get('targetType')}
          options={AUDIT_TARGET_TYPES}
          onChange={(targetType) => set({ targetType })}
          allLabel="Any record"
        />
        <SearchBox
          label="Filter by actor id"
          value={get('actor')}
          placeholder="Actor id"
          onSearch={(actor) => set({ actor })}
        />
        {target && (
          <button
            type="button"
            onClick={() => set({ targetId: undefined })}
            className="text-sm font-bold text-teal-800 hover:underline"
          >
            Clear record {target.slice(-8)}
          </button>
        )}
      </ListToolbar>

      <DataTable<AuditEntry>
        caption="Audit log"
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(row) => row.id}
        page={list.data?.page ?? page}
        pages={list.data?.pages ?? 1}
        total={list.data?.total ?? 0}
        limit={list.data?.limit ?? 20}
        onPage={(next) => set({ page: next })}
        isPending={list.isPending}
        isFetching={list.isFetching}
        error={list.isError ? messageOf(list.error) : null}
        onRetry={() => void list.refetch()}
        empty="Nothing recorded yet."
      />
    </div>
  );
}
