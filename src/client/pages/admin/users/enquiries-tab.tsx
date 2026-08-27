import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useAdminInquiries, useDeclineInquiry, useInviteInquiry } from '@/hooks/useAdminInquiries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminInquiry } from '@/services/admin.service';
import { PROFESSIONAL_INQUIRY_STATUSES } from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { ConfirmDialog, type ReasonMode } from '../_components/confirm-dialog';
import { DataTable, type Column } from '../_components/data-table';
import { FilterSelect, ListToolbar, SearchBox } from '../_components/list-toolbar';

type Decision = 'invite' | 'decline';

type Pending = { inquiry: AdminInquiry; decision: Decision };

const ACTION =
  'rounded-md border border-teal-900/15 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-900/5';

/**
 * What each decision does, and whether it owes an explanation.
 *
 * Inviting does not: an approval owes nobody a paragraph, and a required box here
 * would only ever collect the word "ok". Declining does, because the reason is what
 * the queue and the audit log are left with — the applicant is told only that the
 * enquiry was not taken further.
 */
const DECISION: Record<Decision, { verb: string; reason: ReasonMode; blurb: string }> = {
  invite: {
    verb: 'Invite',
    reason: 'optional',
    blurb:
      'Emails a link to the full application, good for a fortnight. Anything you type goes in the email above the link.',
  },
  decline: {
    verb: 'Decline',
    reason: 'required',
    blurb:
      'Closes the enquiry and frees the address so they can write in again. The reason stays here and in the audit log; the email says only that it was not taken further.',
  },
};

/** Which decisions make sense from where the enquiry already is. */
const OPEN_TO: Record<AdminInquiry['status'], Decision[]> = {
  pending: ['invite', 'decline'],
  // Resending is the same call, and declining after inviting withdraws the link.
  invited: ['invite', 'decline'],
  declined: [],
  completed: [],
};

function on(date: string): string {
  return format(parseISO(date), 'd MMM yyyy');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** Where the invitation stands, in the words the queue needs. */
function InviteState({ inquiry }: { inquiry: AdminInquiry }) {
  if (inquiry.status === 'completed') {
    return (
      <span className="text-xs font-semibold text-emerald-800">
        Application filed{inquiry.completedAt ? ` ${on(inquiry.completedAt)}` : ''}
      </span>
    );
  }

  if (inquiry.status === 'declined') {
    return <span className="text-xs font-semibold text-rose-700">Declined</span>;
  }

  if (inquiry.status !== 'invited') {
    return <span className="text-xs text-slate-500">Waiting on you</span>;
  }

  return (
    <span
      className={`text-xs font-semibold ${inquiry.inviteLive ? 'text-teal-800' : 'text-amber-700'}`}
    >
      {inquiry.inviteLive ? 'Link live' : 'Link expired'}
      {inquiry.inviteExpiresAt && (
        <span className="block font-normal text-slate-500">
          {inquiry.inviteLive ? 'until' : 'since'} {on(inquiry.inviteExpiresAt)}
        </span>
      )}
      {inquiry.inviteCount > 1 && (
        <span className="block font-normal text-slate-500">Sent {inquiry.inviteCount} times</span>
      )}
    </span>
  );
}

/** The enquiry itself, folded away until a reviewer opens it. */
function Enquiry({ inquiry }: { inquiry: AdminInquiry }) {
  return (
    <details className="mt-2">
      {/* A native disclosure, so it opens with the keyboard and needs no aria. */}
      <summary className="cursor-pointer text-xs font-bold text-teal-800 hover:underline">
        Read the enquiry
      </summary>

      <dl className="mt-2 space-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Licence claimed</dt>
          <dd>{inquiry.licenseNumber}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">Where</dt>
          <dd>
            {inquiry.currentLocation}
            {inquiry.clinicLocation ? ` · practises in ${inquiry.clinicLocation}` : ''}
          </dd>
        </div>
        {(inquiry.phone || inquiry.yearsExperience !== null) && (
          <div>
            <dt className="font-bold uppercase tracking-wider text-slate-500">Also given</dt>
            <dd>
              {[
                inquiry.phone,
                inquiry.yearsExperience !== null ? `${inquiry.yearsExperience} years` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-500">
            Why they want to join
          </dt>
          <dd className="whitespace-pre-line leading-6">{inquiry.motivation}</dd>
        </div>
        {inquiry.inviteNote && (
          <div>
            <dt className="font-bold uppercase tracking-wider text-slate-500">Note you sent</dt>
            <dd className="leading-6">{inquiry.inviteNote}</dd>
          </div>
        )}
        {inquiry.declineReason && (
          <div>
            <dt className="font-bold uppercase tracking-wider text-slate-500">
              Why it was declined
            </dt>
            <dd className="leading-6">{inquiry.declineReason}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}

/**
 * The queue that comes before the queue.
 *
 * Every application on the next tab started here, as a few lines from somebody
 * with an account and nothing else. Defaults to pending, like the server does,
 * because that is the only status anybody is waiting on.
 *
 * The link an invitation mints is shown once, in the line under the table. It is
 * stored as a hash and cannot be read again, so if the email bounced this is the
 * only chance to pass it on by hand — and it is deliberately not written into the
 * cache, which would keep a live credential in memory for as long as the tab stayed
 * open.
 */
export default function EnquiriesTab() {
  useDocumentTitle('Admin enquiries', 'Invite or turn down professional enquiries.');

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);

  const params = {
    page,
    q: get('q'),
    status: pick(get('status'), PROFESSIONAL_INQUIRY_STATUSES),
  };

  const list = useAdminInquiries(params);
  const invite = useInviteInquiry();
  const decline = useDeclineInquiry();

  const busy = pending?.decision === 'invite' ? invite : decline;

  function open(next: Pending): void {
    invite.reset();
    decline.reset();
    setPending(next);
  }

  function confirm(reason: string | null): void {
    if (!pending) return;

    if (pending.decision === 'invite') {
      invite.mutate(
        { id: pending.inquiry.id, ...(reason ? { note: reason } : {}) },
        { onSuccess: () => setPending(null) }
      );
      return;
    }

    // The dialog holds the button until the shared floor is met, so by here there
    // is a reason; the empty string would be refused by the route anyway.
    decline.mutate(
      { id: pending.inquiry.id, reason: reason ?? '' },
      { onSuccess: () => setPending(null) }
    );
  }

  const columns: Column<AdminInquiry>[] = [
    {
      header: 'Enquiry',
      cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate font-bold text-slate-950">{row.name}</p>
          <p className="truncate text-xs text-slate-500">{row.email}</p>
          <Enquiry inquiry={row} />
        </div>
      ),
    },
    { header: 'Where it stands', cell: (row) => <InviteState inquiry={row} /> },
    {
      header: 'Written in',
      secondary: true,
      cell: (row) => <span className="text-xs text-slate-600">{on(row.createdAt)}</span>,
    },
    {
      header: 'Decision',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {OPEN_TO[row.status].map((decision) => (
            <button
              key={decision}
              type="button"
              onClick={() => open({ inquiry: row, decision })}
              className={`${ACTION} ${decision === 'invite' ? '' : 'text-rose-700'}`}
            >
              {/* A second invitation is a resend, and saying so is the difference
                  between "again?" and "the first one went astray". */}
              {decision === 'invite' && row.status === 'invited'
                ? 'Resend'
                : DECISION[decision].verb}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Read what somebody wrote in with, then either email them the application link or turn the
        enquiry down. Nobody fills in the long form uninvited.
      </p>

      <ListToolbar>
        <SearchBox
          label="Search enquiries"
          value={get('q')}
          placeholder="Name, email or licence"
          onSearch={(q) => set({ q })}
        />
        <FilterSelect
          label="Status"
          value={get('status') ?? 'pending'}
          options={PROFESSIONAL_INQUIRY_STATUSES}
          onChange={(status) => set({ status })}
          allLabel="Any status"
        />
      </ListToolbar>

      <DataTable<AdminInquiry>
        caption="Professional enquiries"
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
        empty="No enquiries waiting."
      />

      {pending && (
        <ConfirmDialog
          open
          title={`${
            pending.decision === 'invite' && pending.inquiry.status === 'invited'
              ? 'Resend the link to'
              : `${DECISION[pending.decision].verb}`
          } ${pending.inquiry.email}?`}
          description={
            <>{DECISION[pending.decision].blurb} Recorded in the audit log against your account.</>
          }
          confirmLabel={DECISION[pending.decision].verb}
          reason={DECISION[pending.decision].reason}
          destructive={pending.decision === 'decline'}
          isPending={busy.isPending}
          error={busy.isError ? messageOf(busy.error) : null}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}

      {invite.isSuccess && (
        <div role="status" className="rounded-md bg-teal-50 px-3 py-2 text-sm text-slate-700">
          <p className="font-semibold">
            {invite.data.delivered
              ? `Link emailed to ${invite.data.inquiry.email}.`
              : `The email did not go out: ${invite.data.deliveryError}`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            This is the only time the link is readable — it is kept as a hash. Send it on by hand if
            the email bounced.
          </p>
          <code className="mt-1 block break-all text-xs font-semibold text-teal-900">
            {invite.data.link}
          </code>
        </div>
      )}

      {decline.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          Enquiry declined
          {decline.data.delivered
            ? ' and the applicant has been told.'
            : `, but the email did not go out: ${decline.data.deliveryError}`}
        </p>
      )}
    </div>
  );
}
