import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useAdminBlogs, useModerateBlog, usePurgeBlog } from '@/hooks/useAdminBlogs';
import { useMetricsOverview } from '@/hooks/useAdminMetrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminBlogSummary } from '@/services/admin.service';
import { BLOG_STATUSES } from '@shared/schemas';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog, type ReasonMode } from './_components/confirm-dialog';
import { ModerationNote } from './_components/moderation-note';
import { DataTable, type Column } from './_components/data-table';
import { FilterSelect, ListToolbar, SearchBox } from './_components/list-toolbar';
import { StatusBadge } from './_components/status-badge';

type Decision = 'approve' | 'hide' | 'remove' | 'restore' | 'delete';

type Pending = { post: AdminBlogSummary; decision: Decision };

const ACTION =
  'rounded-md border border-teal-900/15 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-900/5';

/**
 * Hiding is what an admin reaches for while still deciding, so it does not demand
 * a written justification — asking for one at that point only teaches people to
 * type 'checking'. A takedown is the record somebody will be asked to defend.
 */
const DECISION: Record<Decision, { verb: string; reason: ReasonMode; blurb: string }> = {
  approve: {
    verb: 'Approve',
    reason: 'optional',
    blurb:
      'Overrules the automatic screen and publishes the post. The verdict stays on the record beside your decision.',
  },
  hide: {
    verb: 'Hide',
    reason: 'optional',
    blurb: 'Drops it from the public feed straight away. Reversible, and the post is untouched.',
  },
  remove: {
    verb: 'Take down',
    reason: 'required',
    blurb:
      'Drops it from the feed and marks it removed. Still not a delete — the post stays and can come back.',
  },
  restore: {
    verb: 'Restore',
    reason: 'optional',
    blurb:
      'Puts it back where it was: published if it had ever been live, a draft if it never was.',
  },
  delete: {
    verb: 'Delete permanently',
    reason: 'required',
    blurb:
      'Erases the post. This one cannot be undone — only the audit entry survives it, with your reason on it.',
  },
};

/** Which verdicts make sense from where the post already is. */
const OPEN_TO: Record<string, Decision[]> = {
  draft: ['hide', 'remove'],
  published: ['hide', 'remove'],
  // A held post is already out of the feed, so hiding it would change nothing.
  // The only two answers to a hold are "publish it after all" and "no".
  flagged: ['approve', 'remove'],
  hidden: ['restore', 'remove'],
  // Deleting is only offered from here, which is the whole two-step: a takedown
  // first, reversible and with a reason on it, and only then the permanent one.
  removed: ['restore', 'delete'],
};

function written(date: string): string {
  return format(parseISO(date), 'd MMM yyyy');
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Every post, at every status — which is the whole point of this list sitting next
 * to the public one: a moderator cannot action what the feed hides from them.
 *
 * The row links to the live post for anything the public can still read, because
 * the decision is about the writing and this list only shows the excerpt.
 */
export default function AdminBlogsPage() {
  useDocumentTitle('Admin posts', 'Hide, take down or restore blog posts.');

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);

  const params = {
    page,
    q: get('q'),
    tag: get('tag'),
    status: pick(get('status'), BLOG_STATUSES),
  };

  const list = useAdminBlogs(params);
  const moderate = useModerateBlog();
  const purge = usePurgeBlog();

  // Whichever of the two the open dialog is driving, so its pending and error
  // states come from the mutation that is actually running.
  const active = pending?.decision === 'delete' ? purge : moderate;

  const overview = useMetricsOverview();
  const held = overview.data?.totals.flaggedBlogs ?? 0;
  const filtered = get('status') === 'flagged';

  function open(next: Pending): void {
    moderate.reset();
    purge.reset();
    setPending(next);
  }

  function confirm(reason: string | null): void {
    if (!pending) return;

    const done = { onSuccess: () => setPending(null) };

    // The server requires a reason for a deletion too, so this is only ever null
    // when the dialog would not have enabled its button.
    if (pending.decision === 'delete') {
      purge.mutate({ id: pending.post.id, reason: reason ?? '' }, done);
      return;
    }

    moderate.mutate(
      { id: pending.post.id, decision: pending.decision, ...(reason ? { reason } : {}) },
      done
    );
  }

  const columns: Column<AdminBlogSummary>[] = [
    {
      header: 'Post',
      cell: (row) => (
        <div className="min-w-0 max-w-lg">
          <p className="font-bold text-slate-950">
            {/* Only linked while the public route would answer: a hidden or removed
                post 404s there, and a link that leads to a 404 is worse than none. */}
            {row.status === 'published' ? (
              <Link to={`/blogs/${row.slug}`} className="hover:underline">
                {row.title}
              </Link>
            ) : (
              row.title
            )}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.excerpt}</p>
          {row.removedReason && (
            <p className="mt-1 text-xs font-semibold text-rose-700">{row.removedReason}</p>
          )}
          <ModerationNote moderation={row.moderation} />
          {row.tags.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {row.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => set({ tag })}
                  className="rounded bg-teal-900/5 px-1.5 py-0.5 text-[11px] font-bold text-teal-900 hover:bg-teal-900/10"
                >
                  {tag}
                </button>
              ))}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Author',
      secondary: true,
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {/* The post outlives the account that wrote it, so a missing author is a
              state and not an error. */}
          {row.author?.email ?? 'Account gone'}
        </span>
      ),
    },
    {
      header: 'Written',
      secondary: true,
      cell: (row) => <span className="text-xs text-slate-600">{written(row.createdAt)}</span>,
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
              onClick={() => open({ post: row, decision })}
              className={`${ACTION} ${
                decision === 'remove' || decision === 'delete' ? 'text-rose-700' : ''
              }`}
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
        <h2 className="text-lg font-black tracking-tight">Posts</h2>
        <p className="mt-1 text-sm text-slate-600">
          Held, drafted and taken-down posts are all here. The list is ordered worst verdict first,
          so anything waiting on you is at the top.
        </p>
      </div>

      {/* The only thing on this page with somebody waiting on it, so it says how
          many and filters straight to them rather than being a number to read.
          Hidden once the filter is on: it would then be describing the list. */}
      {held > 0 && !filtered && (
        <section className="rounded-lg border border-amber-300/60 bg-amber-50 p-4">
          <h3 className="text-sm font-black tracking-tight text-amber-900">
            {held} post{held === 1 ? '' : 's'} held for review
          </h3>
          <button
            type="button"
            onClick={() => set({ status: 'flagged' })}
            className="mt-1 text-sm font-bold text-amber-900 underline hover:no-underline"
          >
            Show only those
          </button>
        </section>
      )}

      <ListToolbar>
        <SearchBox
          label="Search posts"
          value={get('q')}
          placeholder="Title, excerpt or tag"
          onSearch={(q) => set({ q })}
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          options={BLOG_STATUSES}
          onChange={(status) => set({ status })}
        />
        {get('tag') && (
          <button
            type="button"
            onClick={() => set({ tag: undefined })}
            className="text-sm font-bold text-teal-800 hover:underline"
          >
            Clear tag &ldquo;{get('tag')}&rdquo;
          </button>
        )}
      </ListToolbar>

      <DataTable<AdminBlogSummary>
        caption="Blog posts"
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
        empty="No posts match those filters."
      />

      {pending && (
        <ConfirmDialog
          open
          title={`${DECISION[pending.decision].verb} \u201c${pending.post.title}\u201d?`}
          description={
            <>{DECISION[pending.decision].blurb} Recorded in the audit log against your account.</>
          }
          confirmLabel={DECISION[pending.decision].verb}
          reason={DECISION[pending.decision].reason}
          destructive={pending.decision === 'remove' || pending.decision === 'delete'}
          isPending={active.isPending}
          error={active.isError ? messageOf(active.error) : null}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}

      {moderate.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          &ldquo;{moderate.data.blog.title}&rdquo; went from {moderate.data.statusFrom} to{' '}
          {moderate.data.statusTo}.
        </p>
      )}

      {purge.isSuccess && (
        <p role="status" className="text-sm font-semibold text-slate-600">
          &ldquo;{purge.data.title}&rdquo; was deleted. The audit entry is all that is left of it.
        </p>
      )}
    </div>
  );
}
