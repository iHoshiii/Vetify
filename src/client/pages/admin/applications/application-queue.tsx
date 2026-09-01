import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import {
  useAdminProfessionals,
  useReviewProfessional,
  useScheduleInterview,
} from '@/hooks/useAdminProfessionals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminProfessional } from '@/services/admin.service';
import type { ProfessionalStatus } from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog, type ReasonMode } from '../_components/confirm-dialog';
import { DataTable, type Column } from '../_components/data-table';
import { InterviewDialog } from '../_components/interview-dialog';
import { FilterSelect, ListToolbar, SearchBox } from '../_components/list-toolbar';
import { RoleBadge } from '../_components/role-badge';
import { StatusBadge } from '../_components/status-badge';

type Decision = 'verify' | 'reject' | 'suspend';

type Pending = { application: AdminProfessional; decision: Decision };

const ACTION =
  'rounded-md border border-teal-900/15 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-900/5';

/**
 * Turning somebody down, or pulling a live listing, is the record they will ask
 * about later. Accepting is not, so it does not demand a paragraph.
 *
 * The keys are the server's words and the verbs are the screen's: the route is still
 * `/verify`, because renaming a status enum would mean migrating every row that
 * already holds one, and 'verified' is what the public directory reads. Only the
 * label changed, so this map is the one place the two vocabularies meet.
 */
const DECISION: Record<Decision, { verb: string; reason: ReasonMode; blurb: string }> = {
  verify: {
    verb: 'Accept',
    reason: 'optional',
    blurb:
      'Publishes them to the directory, makes their account a professional, and emails them to say so.',
  },
  reject: {
    verb: 'Reject',
    reason: 'required',
    blurb:
      'Turns the application down and returns the account to a normal user. Your reason is emailed to them and shown on their own page.',
  },
  suspend: {
    verb: 'Suspend',
    reason: 'required',
    blurb:
      'Pulls the listing from the directory and returns the account to a normal user. No email goes out; a suspension is yours to explain.',
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

export type Phase = 'application' | 'accepted' | 'rejected' | 'completed';

/**
 * What each phase of the queue is looking at.
 *
 * One component parameterised rather than four that would drift apart. A phase
 * decides only where the queue starts, how far its filter reaches, and whether its
 * rows are still open to a verdict — which verdicts a row offers still comes from
 * `OPEN_TO` and `INTERVIEWABLE` above, keyed on the status the row is actually in, so
 * no two screens can disagree about what may be done to a verified application.
 *
 * 'rejected' has its own tab rather than sitting under Application: a refusal is not
 * waiting on anybody, and leaving it in the queue of things that are made the count
 * on the tab badge a number nobody could act on.
 */
const PHASE: Record<
  Phase,
  {
    title: string;
    description: string;
    /**
     * The statuses the tab opens on when the URL names none. Several for a tab that
     * spans them; exactly one wherever `allLabel` is null, since the filter then has
     * no "everything" option to fall back to.
     */
    opens: ProfessionalStatus[];
    /** How far the filter reaches. Never past the phase. */
    statuses: ProfessionalStatus[];
    /** The "no filter" option, or null on a tab that opens on a single status. */
    allLabel: string | null;
    /** Whether rows here are still open to a verdict. */
    decides: boolean;
    blurb: string;
    caption: string;
    empty: string;
  }
> = {
  application: {
    title: 'Application',
    description: 'Accept or turn down filed professional applications.',
    // Both, because both are waiting on a verdict: an application being talked about
    // is no less open than one nobody has read yet.
    opens: ['pending', 'interview'],
    statuses: ['pending', 'interview'],
    allLabel: 'Awaiting a verdict',
    decides: true,
    blurb:
      'The long form, filed. Open the submission and check the licence against the issuing authority before accepting. Both verdicts email the applicant — a rejection carries the reason you give.',
    caption: 'Applications awaiting a verdict',
    empty: 'Nothing waiting on a decision.',
  },
  accepted: {
    title: 'Accepted',
    description: 'The vets in the directory, and the ones pulled out of it.',
    opens: ['verified'],
    statuses: ['verified', 'suspended'],
    allLabel: null,
    decides: true,
    blurb:
      'Everyone the directory shows. Suspending is the reversible half of a rejection, for a licence that was good when it was checked and something has since come up.',
    caption: 'Accepted professionals',
    empty: 'Nobody is listed yet.',
  },
  rejected: {
    title: 'Rejected',
    description: 'Applications that were turned down.',
    opens: ['rejected'],
    statuses: ['rejected'],
    allLabel: null,
    decides: true,
    // Still open to a verdict, which is the point of the tab rather than an oversight:
    // an appeal is re-opened from the screen that shows the refusal.
    blurb:
      'Turned down, with the reason each one was given. An appeal is heard from here — book an interview, or accept the application outright if the objection has been answered.',
    caption: 'Rejected applications',
    empty: 'Nothing has been turned down.',
  },
  completed: {
    title: 'Completed',
    description: 'Every application that reached an end, whichever end it was.',
    opens: ['verified', 'rejected', 'suspended'],
    statuses: ['verified', 'rejected', 'suspended'],
    allLabel: 'Any outcome',
    // Read-only on purpose. The same rows are actionable one tab over, under the
    // outcome they actually landed in; an archive that could also change what it
    // records is two screens fighting over one row.
    decides: false,
    blurb:
      'The finished pipeline, both outcomes in one list. A record rather than a queue: to act on any of these, open Accepted or Rejected.',
    caption: 'Completed applications',
    empty: 'Nothing has been decided yet.',
  },
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
          <dt className="font-bold uppercase tracking-wider text-slate-500">
            Experience &amp; rate
          </dt>
          <dd className="space-y-1">
            <div>
              {application.yearsExperience} year{application.yearsExperience === 1 ? '' : 's'}{' '}
              &middot; ${application.hourlyRate}/hr &middot; {application.specialties.join(', ')}
            </div>
            {/* Set above what the experience on the licence earns. Not a block on
                anything — the listing is live either way — just the one number on
                this card a reviewer might want to ask about. */}
            {application.flaggedForRateReview && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                Above the rate their {application.yearsExperience} yrs allows
              </span>
            )}
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
 * One phase of the application pipeline, drawn as a queue.
 *
 * Opens on the statuses the phase is about — for Application the two anybody is
 * waiting on, for Accepted the directory as it stands, for Completed both endings at
 * once. The filter reaches the rest of that phase and no further; the figures
 * describing the pipeline as a whole belong to the section above, where every phase
 * can see them.
 *
 * A verdict moves two things at once: the application's status and the applicant's
 * role. The reply carries both, and the line under the table says what moved, so
 * "verified" never appears next to an account still reading 'user'.
 */
export default function ApplicationQueue({ phase }: { phase: Phase }) {
  const view = PHASE[phase];

  useDocumentTitle(`Admin ${view.title.toLowerCase()}`, view.description);

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);
  const [booking, setBooking] = useState<AdminProfessional | null>(null);

  const params = {
    page,
    q: get('q'),
    // Falls back to the phase rather than to the server default. Accepted has to open
    // on 'verified'; letting the server choose would open it on the pending queue.
    status: pick(get('status'), view.statuses) ?? view.opens,
  };

  const list = useAdminProfessionals(params);
  const review = useReviewProfessional();
  const interview = useScheduleInterview();

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
    // The archive's own column, and the only thing it has that the outcome tabs do
    // not: on a record of what was decided, when it was decided is half the record.
    ...(view.decides
      ? []
      : [
          {
            header: 'Decided',
            secondary: true,
            cell: (row: AdminProfessional) => (
              <span className="text-xs text-slate-600">
                {row.reviewedAt ? submitted(row.reviewedAt) : '—'}
              </span>
            ),
          },
        ]),
    // Absent rather than empty on the archive. A column of blank cells reads as
    // "you may act here and cannot", which is the opposite of what it would mean.
    ...(view.decides
      ? [
          {
            header: 'Decision',
            align: 'right' as const,
            cell: (row: AdminProfessional) => (
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
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">{view.blurb}</p>

      <ListToolbar>
        <SearchBox
          label="Search applications"
          value={get('q')}
          placeholder="Clinic, licence or name"
          onSearch={(q) => set({ q })}
        />
        {/* No "any status" that reaches past the phase — that would make two tabs the
            same screen twice. A phase spanning several statuses does get an
            "everything here" option, because narrowing within a phase is the one thing
            this filter is for. */}
        <FilterSelect
          label="Status"
          value={get('status') ?? (view.allLabel === null ? view.opens[0] : undefined)}
          options={view.statuses}
          onChange={(status) => set({ status })}
          allLabel={view.allLabel}
        />
      </ListToolbar>

      <DataTable<AdminProfessional>
        caption={view.caption}
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
        empty={view.empty}
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
          .{' '}
          {/* Silent for a suspension, which owes the vet nothing: reporting that no
              email was sent about one nobody tried to send is noise. */}
          {review.data.mail &&
            (review.data.mail.delivered
              ? 'The applicant has been told.'
              : `The applicant was not told: ${review.data.mail.deliveryError}`)}
        </p>
      )}
    </div>
  );
}
