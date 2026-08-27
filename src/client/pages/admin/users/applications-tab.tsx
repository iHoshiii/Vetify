import { useMetricsBreakdown, useMetricsTimeseries } from '@/hooks/useAdminMetrics';
import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import {
  useAdminProfessionals,
  useReviewProfessional,
  useScheduleInterview,
} from '@/hooks/useAdminProfessionals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminProfessional } from '@/services/admin.service';
import { PROFESSIONAL_STATUSES } from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { BreakdownChart } from '../_components/breakdown-chart';
import { ConfirmDialog, type ReasonMode } from '../_components/confirm-dialog';
import { DataTable, type Column } from '../_components/data-table';
import { InterviewDialog } from '../_components/interview-dialog';
import { FilterSelect, ListToolbar, SearchBox } from '../_components/list-toolbar';
import { MetricChart } from '../_components/metric-chart';
import { RoleBadge } from '../_components/role-badge';
import { StatCard, StatCardSkeleton } from '../_components/stat-card';
import { StatusBadge } from '../_components/status-badge';

type Decision = 'verify' | 'reject' | 'suspend';

type Pending = { application: AdminProfessional; decision: Decision };

const ACTION =
  'rounded-md border border-teal-900/15 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-900/5';

/** The window the applications line covers, matching the accounts tabs. */
const WINDOW_DAYS = 30;

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
  interview: ['verify', 'reject'],
  verified: ['suspend'],
  rejected: ['verify'],
  suspended: ['verify'],
};

/**
 * Where an interview can be booked from.
 *
 * Not a verdict, so it sits beside the three rather than among them. 'rejected' is
 * in the list because an appeal that gets a hearing is exactly this move, and
 * 'interview' is because a booking that has to move is a rebooking.
 */
const INTERVIEWABLE = ['pending', 'interview', 'rejected'];

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
export default function ApplicationsTab() {
  useDocumentTitle('Admin applications', 'Verify or turn down professional applications.');

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);
  const [booking, setBooking] = useState<AdminProfessional | null>(null);

  const params = {
    page,
    q: get('q'),
    status: pick(get('status'), PROFESSIONAL_STATUSES),
  };

  const list = useAdminProfessionals(params);
  const review = useReviewProfessional();
  const interview = useScheduleInterview();

  const statuses = useMetricsBreakdown('professionalStatus');
  const filed = useMetricsTimeseries('applications', WINDOW_DAYS);

  function counted(status: string): number {
    return statuses.data?.slices.find((slice) => slice.label === status)?.count ?? 0;
  }

  function open(next: Pending): void {
    review.reset();
    interview.reset();
    setPending(next);
  }

  function openBooking(application: AdminProfessional): void {
    review.reset();
    interview.reset();
    setBooking(application);
  }

  function book(input: { interviewAt: string; note: string | null }): void {
    if (!booking) return;

    interview.mutate(
      {
        id: booking.id,
        interviewAt: input.interviewAt,
        ...(input.note ? { note: input.note } : {}),
      },
      { onSuccess: () => setBooking(null) }
    );
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
    {
      header: 'Application',
      cell: (row) => (
        <div>
          <StatusBadge status={row.status} />
          {row.interviewAt && (
            <p className="mt-1 text-xs font-semibold text-blue-800">
              {format(parseISO(row.interviewAt), 'd MMM yyyy, HH:mm')}
            </p>
          )}
        </div>
      ),
    },
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
          {INTERVIEWABLE.includes(row.status) && (
            <button type="button" onClick={() => openBooking(row)} className={ACTION}>
              {/* A booking that already exists is being moved, not made. */}
              {row.interviewAt ? 'Rebook' : 'Interview'}
            </button>
          )}
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
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Open the submission and check the licence against the issuing authority before verifying.
      </p>

      <dl
        className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${
          statuses.isFetching ? 'opacity-60' : ''
        }`}
      >
        {statuses.isPending || !statuses.data
          ? PROFESSIONAL_STATUSES.map((status) => <StatCardSkeleton key={status} />)
          : PROFESSIONAL_STATUSES.map((status) => (
              <StatCard key={status} label={status} value={counted(status)} />
            ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownChart
          label="Applications by status"
          variant="bar"
          slices={statuses.data?.slices ?? []}
          total={statuses.data?.total ?? 0}
          isPending={statuses.isPending}
          error={statuses.isError ? messageOf(statuses.error) : null}
          onRetry={() => void statuses.refetch()}
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

      {booking && (
        <InterviewDialog
          open
          applicant={booking.applicant?.email ?? booking.fullName}
          isPending={interview.isPending}
          error={interview.isError ? messageOf(interview.error) : null}
          onCancel={() => setBooking(null)}
          onConfirm={book}
        />
      )}

      {interview.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          Interview booked
          {interview.data.delivered
            ? ' and the applicant has been told when.'
            : `, but the email did not go out: ${interview.data.deliveryError}`}
        </p>
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
