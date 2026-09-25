import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useAdminReviewReports, useDecideReviewReport } from '@/hooks/useAdminReviews';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AdminReviewReport } from '@/services/admin-reviews.service';
import { REVIEW_REPORT_STATUSES } from '@shared/schemas';
import { useState } from 'react';

import { ConfirmDialog } from '../_components/confirm-dialog';
import { DataTable } from '../_components/data-table';
import { FilterSelect, ListToolbar } from '../_components/list-toolbar';
import { DECISION, reviewColumns, type Pending } from './columns';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

// The moderation queue for reported reviews, pending first. Rows carry the flagged review and reporter unmasked, because admin is a trusted surface.
export default function AdminReviewsPage() {
  useDocumentTitle('Admin reviews', 'Dismiss or remove reported reviews.');

  const { page, get, set } = useAdminListParams();
  const [pending, setPending] = useState<Pending | null>(null);

  const params = {
    page,
    limit: 20,
    status: pick(get('status'), REVIEW_REPORT_STATUSES) ?? 'pending',
  };

  const list = useAdminReviewReports(params);
  const decide = useDecideReviewReport();

  function open(next: Pending): void {
    decide.reset();
    setPending(next);
  }

  function confirm(reason: string | null): void {
    if (!pending) return;
    decide.mutate(
      { id: pending.report.id, action: pending.action, ...(reason ? { reason } : {}) },
      { onSuccess: () => setPending(null) }
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-black tracking-tight">Reviews</h2>

      <ListToolbar>
        <FilterSelect
          label="Status"
          value={get('status')}
          options={REVIEW_REPORT_STATUSES}
          onChange={(status) => set({ status })}
        />
      </ListToolbar>

      <DataTable<AdminReviewReport>
        caption="Reported reviews"
        columns={reviewColumns(open)}
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
        empty="No reports match that filter."
      />

      {pending && (
        <ConfirmDialog
          open
          title={`${DECISION[pending.action].verb}?`}
          description={
            <>{DECISION[pending.action].blurb} Recorded in the audit log against your account.</>
          }
          confirmLabel={DECISION[pending.action].verb}
          reason={DECISION[pending.action].reason}
          destructive={pending.action === 'remove'}
          isPending={decide.isPending}
          error={decide.isError ? messageOf(decide.error) : null}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
