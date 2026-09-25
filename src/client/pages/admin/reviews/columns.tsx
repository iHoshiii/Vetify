import type { AdminReviewReport } from '@/services/admin-reviews.service';
import { format, parseISO } from 'date-fns';

import type { ReasonMode } from '../_components/confirm-dialog';
import type { Column } from '../_components/data-table';
import { StatusBadge } from '../_components/status-badge';

export type Action = 'dismiss' | 'remove';

export type Pending = { report: AdminReviewReport; action: Action };

const ACTION =
  'inline-flex items-center justify-center rounded-md border border-forest-200 bg-white px-2.5 py-1 text-xs font-bold text-forest-700 transition-colors hover:border-forest-400 hover:bg-forest-50';

// Dismiss keeps the review and needs no justification; removing it strips a public rating and moves the vet's average, so it is the record an admin can be asked to defend.
export const DECISION: Record<Action, { verb: string; reason: ReasonMode; blurb: string }> = {
  dismiss: {
    verb: 'Dismiss',
    reason: 'none',
    blurb: 'Leaves the review standing and closes the report. The rating is untouched.',
  },
  remove: {
    verb: 'Remove review',
    reason: 'required',
    blurb:
      "Strips the stars and note off the visit and recomputes the vet's average from what is left. The reply, if any, stays.",
  },
};

function written(date: string): string {
  return format(parseISO(date), 'd MMM yyyy');
}

// The queue columns, with the two decision buttons wired to the caller's dialog.
export function reviewColumns(open: (next: Pending) => void): Column<AdminReviewReport>[] {
  return [
    {
      header: 'Review',
      cell: (row) => (
        <div className="min-w-0 max-w-md">
          <p className="font-bold text-slate-950">
            {row.reviewer ?? 'Account gone'}
            <span className="ml-2 font-semibold text-amber-700">
              {row.stars === null ? 'removed' : `${row.stars} of 5`}
            </span>
          </p>
          {row.comment && (
            <p className="mt-0.5 line-clamp-3 text-xs text-slate-600">{row.comment}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Reported for',
      cell: (row) => (
        <div className="min-w-0 max-w-sm">
          <p className="text-xs font-semibold text-slate-700">{row.reporter ?? 'Account gone'}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{row.reason}</p>
        </div>
      ),
    },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Filed',
      secondary: true,
      cell: (row) => <span className="text-xs text-slate-600">{written(row.createdAt)}</span>,
    },
    {
      header: 'Decision',
      align: 'right',
      cell: (row) =>
        row.status === 'pending' ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {(['dismiss', 'remove'] as const).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => open({ report: row, action })}
                className={`${ACTION} ${action === 'remove' ? 'text-rose-700' : ''}`}
              >
                {DECISION[action].verb}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Decided</span>
        ),
    },
  ];
}
