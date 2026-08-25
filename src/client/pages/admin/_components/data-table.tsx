import type { ReactNode } from 'react';

/**
 * One sort the server actually understands.
 *
 * The token is opaque here — `'newest'`, `'email'`, whatever that list accepts —
 * because the table's job is to send it back, not to interpret it. The direction
 * exists only so the header can say `aria-sort` truthfully.
 */
export type SortOption = { token: string; direction: 'ascending' | 'descending' };

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Tokens this header cycles through on click. Omitted means not sortable. */
  sorts?: SortOption[];
  align?: 'right';
  /** Dropped on narrow screens: context columns, never the identifying one. */
  secondary?: boolean;
};

type DataTableProps<T> = {
  /** Names the table for screen readers; not drawn. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pages: number;
  total: number;
  /** From the response, not assumed: the range line counts rows with it. */
  limit: number;
  onPage: (page: number) => void;
  sort?: string;
  onSort?: (sort: string) => void;
  isPending?: boolean;
  /** Dimmed, not blanked: the current page stays readable while the next loads. */
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: string;
};

const FRAME = 'overflow-hidden rounded-lg border border-teal-900/10 bg-white';
const TH = 'px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500';
const TD = 'px-4 py-3 text-sm text-slate-700';
const PAGE_BUTTON =
  'rounded-md border border-teal-900/15 bg-white px-3 py-1.5 text-xs font-bold text-teal-900 hover:bg-teal-900/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

/** The next token in this column's cycle, given whatever is sorted now. */
function nextSort(column: Column<unknown>, current?: string): string | null {
  const sorts = column.sorts;
  if (!sorts || sorts.length === 0) return null;

  const at = sorts.findIndex((option) => option.token === current);
  // Not this column's turn yet, so start at its first option rather than
  // advancing past it — one click should sort, not sort and then reverse.
  const next = at === -1 ? sorts[0] : sorts[(at + 1) % sorts.length];
  return next?.token ?? null;
}

function sortStateOf(
  column: Column<unknown>,
  current?: string
): 'ascending' | 'descending' | 'none' {
  return column.sorts?.find((option) => option.token === current)?.direction ?? 'none';
}

/** The row range this page covers, for the 'showing 21–40 of 63' line. */
function rangeOf(page: number, rows: number, limit: number, total: number): string {
  if (total === 0 || rows === 0) return 'No rows';

  const first = (page - 1) * limit + 1;
  return `${first}\u2013${first + rows - 1} of ${total.toLocaleString()}`;
}

/**
 * The admin lists, all of them.
 *
 * Every one of the four is a paginated read with a couple of filters and rows a
 * moderator clicks into, so they share this rather than each growing its own
 * copy of the header, the empty row and the paging. Columns arrive as render
 * functions, which is what keeps the badges and buttons out of here.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  page,
  pages,
  total,
  limit,
  onPage,
  sort,
  onSort,
  isPending,
  isFetching,
  error,
  onRetry,
  empty = 'Nothing here yet.',
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className={`${FRAME} p-6`} role="alert">
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-teal-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-900"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={FRAME}>
      <div className={`overflow-x-auto ${isFetching && !isPending ? 'opacity-60' : ''}`}>
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>

          <thead className="border-b border-teal-900/10 bg-teal-900/[0.03]">
            <tr>
              {columns.map((column) => {
                const state = sortStateOf(column as Column<unknown>, sort);
                const target = onSort ? nextSort(column as Column<unknown>, sort) : null;

                return (
                  <th
                    key={column.header}
                    scope="col"
                    aria-sort={column.sorts ? state : undefined}
                    className={`${TH} ${column.align === 'right' ? 'text-right' : ''} ${
                      column.secondary ? 'hidden sm:table-cell' : ''
                    }`}
                  >
                    {target ? (
                      <button
                        type="button"
                        onClick={() => onSort?.(target)}
                        className="inline-flex items-center gap-1 font-black uppercase tracking-wider hover:text-teal-800"
                      >
                        {column.header}
                        {/* Decorative: aria-sort on the header already says it. */}
                        <span aria-hidden="true" className="text-[10px]">
                          {state === 'ascending'
                            ? '\u2191'
                            : state === 'descending'
                            ? '\u2193'
                            : '\u2195'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-teal-900/5">
            {isPending ? (
              // Four rows, because that is enough to look like a table and not
              // enough to jump when the real page is shorter.
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} aria-hidden="true" className="animate-pulse">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={`${TD} ${column.secondary ? 'hidden sm:table-cell' : ''}`}
                    >
                      <div className="h-3 w-24 rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-500">{empty}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-teal-900/[0.02]">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={`${TD} ${column.align === 'right' ? 'text-right' : ''} ${
                        column.secondary ? 'hidden sm:table-cell' : ''
                      }`}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav
        aria-label={`${caption} pages`}
        className="flex items-center justify-between gap-4 border-t border-teal-900/10 px-4 py-3"
      >
        {/* Announced on change so paging is audible without moving focus. */}
        <p aria-live="polite" className="text-xs font-semibold text-slate-600">
          {isPending ? 'Loading\u2026' : rangeOf(page, rows.length, limit, total)}
        </p>

        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className={PAGE_BUTTON}
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-500">
              {page} / {pages}
            </span>
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page >= pages}
              className={PAGE_BUTTON}
            >
              Next
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
