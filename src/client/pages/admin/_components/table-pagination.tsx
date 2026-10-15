import { HEADER_WASH, MUTED, PAGE_BUTTON } from './ui';

type Props = {
  caption: string;
  page: number;
  pages: number;
  total: number;
  limit: number;
  rows: number;
  pending?: boolean;
  onPage: (page: number) => void;
};
function rangeOf(page: number, rows: number, limit: number, total: number) {
  if (total === 0 || rows === 0) return 'No rows';
  const first = (page - 1) * limit + 1;
  return `${first}\u2013${first + rows - 1} of ${total.toLocaleString()}`;
}
export default function TablePagination({
  caption,
  page,
  pages,
  total,
  limit,
  rows,
  pending,
  onPage,
}: Props) {
  return (
    <nav
      aria-label={`${caption} pages`}
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-forest-200 ${HEADER_WASH} px-4 py-3`}
    >
      <p aria-live="polite" className={`${MUTED} tabular-nums`}>
        {pending ? 'Loading\u2026' : rangeOf(page, rows, limit, total)}
      </p>
      {pages > 1 && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className={`${PAGE_BUTTON} min-h-11`}
          >
            Previous
          </button>
          <span className="text-xs font-bold tabular-nums text-slate-600">
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            className={`${PAGE_BUTTON} min-h-11`}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
