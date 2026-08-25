import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useAdminProfessionals, useReviewProfessional } from '@/hooks/useAdminProfessionals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminProfessional } from '@/services/admin.service';
import { PROFESSIONAL_STATUSES } from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { ConfirmDialog, type ReasonMode } from './_components/confirm-dialog';
import { DataTable, type Column } from './_components/data-table';
import { FilterSelect, ListToolbar, SearchBox } from './_components/list-toolbar';
import { RoleBadge } from './_components/role-badge';
import { StatusBadge } from './_components/status-badge';

type Decision = 'verify' | 'reject' | 'suspend';

type Pending = { application: AdminProfessional; decision: Decision };

const ACTION =
  'rounded-md border border-teal-900/15 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-900/5';

/**
 * Turning somebody down, or pulling a live listing, is the record they will ask
 * about later. Approving is not, so it does not demand a paragraph.
 */
const DECISION: Record<Decision, { verb: string; reason: ReasonMode; blurb: string }> = {
  verify: {
    verb: 'Verify',
    reason: 'optional',
    blurb: 'Publishes them to the directory and makes their account a professional.',
  },
  reject: {
    verb: 'Reject',
    reason: 'required',
    blurb:
      'Turns the application down and returns the account to a normal user. They can see the reason.',
  },
  suspend: {
    verb: 'Suspend',
    reason: 'required',
    blurb: 'Pulls the listing from the directory and returns the account to a normal user.',
  },
};

/** Which verdicts make sense from where the application already is. */
const OPEN_TO: Record<string, Decision[]> = {
  pending: ['verify', 'reject'],
  verified: ['suspend'],
  rejected: ['verify'],
  suspended: ['verify'],
};

function submitted(date: string): string {
  return format(parseISO(date), 'd MMM yyyy');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** The submission, folded away until a reviewer opens it. */
function Submission({ application }: { application: AdminProfessional }) {
  return (
    <details className="mt-2">
      {/* A native disclosure, so it opens with the keyboard and needs no aria. */}
      <summary className="cursor-pointer text-xs font-bold text-teal-800 hover:underline">
        Read the application
      </summary>

      <dl className="mt-2 space-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Licence</dt>
          <dd>
            {application.licenseNumber} &middot; {application.licenseAuthority}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Clinic</dt>
          <dd>
            {application.clinicName} &middot; {application.clinicAddress}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Experience</dt>
          <dd>
            {application.yearsExperience} year{application.yearsExperience === 1 ? '' : 's'}{' '}
            &middot; {application.specialties.join(', ')}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Introduction</dt>
          <dd className="whitespace-pre-line leading-6">{application.bio}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Credentials</dt>
          <dd>
            <ul className="space-y-1">
              {application.credentialUrls.map((url) => (
                <li key={url}>
                  {/* Opened in a new tab and marked noreferrer: these are links a
                      stranger supplied, and the reviewer is signed in as an admin. */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-semibold text-teal-800 hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </details>
  );
}

/**
 * The verification queue.
 *
 * Defaults to pending, because that is the only status anybody is waiting on — the
 * server defaults the same way, and the filter here is what lets a reviewer go
 * looking at the ones already decided.
 *
 * A verdict moves two things at once: the application's status and the applicant's
 * role. The reply carries both, and the line under the table says what moved, so
 * "verified" never appears next to an account still reading 'user'.
 */
export default function AdminProfessionalsPage() {
  useDocumentTitle('Admin applications', 'Verify or turn down professional applications.');

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);

  const params = {
    page,
    q: get('q'),
    status: pick(get('status'), PROFESSIONAL_STATUSES),
  };

  const list = useAdminProfessionals(params);
  const review = useReviewProfessional();

  function open(next: Pending): void {
    review.reset();
    setPending(next);
  }

  function confirm(reason: string | null): void {
    if (!pending) return;

    review.mutate(
      {
        id: pending.application.id,
        decision: pending.decision,
        ...(reason ? { reason } : {}),
      },
      { onSuccess: () => setPending(null) }
    );
  }

  const columns: Column<AdminProfessional>[] = [
    {
      header: 'Applicant',
      cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate font-bold text-slate-950">
            {row.applicant?.name ?? row.clinicName}
          </p>
          <p className="truncate text-xs text-slate-500">
            {/* The account may be gone from under the application; the licence
                number is the one identifier the submission itself carries. */}
            {row.applicant?.email ?? `Licence ${row.licenseNumber}`}
          </p>
          {row.rejectionReason && (
            <p className="mt-1 text-xs font-semibold text-rose-700">{row.rejectionReason}</p>
          )}
          <Submission application={row} />
        </div>
      ),
    },
    { header: 'Application', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Account',
      secondary: true,
      cell: (row) =>
        row.applicant ? <RoleBadge role={row.applicant.role} /> : <span>&mdash;</span>,
    },
    {
      header: 'Filed',
      secondary: true,
      cell: (row) => <span className="text-xs text-slate-600">{submitted(row.createdAt)}</span>,
    },
    {
      header: 'Decision',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {(OPEN_TO[row.status] ?? []).map((decision) => (
            <button
              key={decision}
              type="button"
              onClick={() => open({ application: row, decision })}
              className={`${ACTION} ${decision === 'verify' ? '' : 'text-rose-700'}`}
            >
              {DECISION[decision].verb}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">Applications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Open the submission and check the licence against the issuing authority before verifying.
        </p>
      </div>

      <ListToolbar>
        <SearchBox
          label="Search applications"
          value={get('q')}
          placeholder="Clinic, licence or name"
          onSearch={(q) => set({ q })}
        />
        <FilterSelect
          label="Status"
          value={get('status') ?? 'pending'}
          options={PROFESSIONAL_STATUSES}
          onChange={(status) => set({ status })}
          allLabel="Any status"
        />
      </ListToolbar>

      <DataTable<AdminProfessional>
        caption="Professional applications"
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
        empty="Nothing waiting on a decision."
      />

      {pending && (
        <ConfirmDialog
          open
          title={`${DECISION[pending.decision].verb} ${
            pending.application.applicant?.email ?? pending.application.clinicName
          }?`}
          description={
            <>{DECISION[pending.decision].blurb} Recorded in the audit log against your account.</>
          }
          confirmLabel={DECISION[pending.decision].verb}
          reason={DECISION[pending.decision].reason}
          destructive={pending.decision !== 'verify'}
          isPending={review.isPending}
          error={review.isError ? messageOf(review.error) : null}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}

      {review.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          Application is now {review.data.application.status}
          {review.data.roleFrom === review.data.roleTo
            ? ' and the account role is unchanged'
            : `, and the account went from ${review.data.roleFrom} to ${review.data.roleTo}`}
          .
        </p>
      )}
    </div>
  );
}
