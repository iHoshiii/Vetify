import { BUTTON_SM, FRAME, HEADER_WASH, LABEL, ROW_HOVER } from './ui';
import { nextSort, sortStateOf, type Column, type DataTableProps } from './data-table-types';
import TablePagination from './table-pagination';
export type { Column, SortOption } from './data-table-types';
const PANEL = `overflow-hidden ${FRAME}`;
const TH = `px-2 py-3 text-left xl:px-4 ${LABEL}`;
const TD = 'px-2 py-3 text-xs text-slate-700 sm:text-sm xl:px-4';

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
      <div className={`${PANEL} p-6`} role="alert">
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={`mt-3 ${BUTTON_SM}`}>
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={PANEL}>
      <div className={`min-w-0 ${isFetching && !isPending ? 'opacity-60' : ''}`}>
        <table className="admin-data-table w-full table-fixed border-collapse xl:table-auto">
          <caption className="sr-only">{caption}</caption>

          <thead className={`border-b border-forest-200 ${HEADER_WASH}`}>
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
                        className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 whitespace-normal text-left uppercase tracking-wider transition-colors hover:text-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 xl:min-h-0"
                      >
                        {column.header}

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

          <tbody className="divide-y divide-forest-100">
            {isPending ? (
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} aria-hidden="true" className="animate-pulse">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={`${TD} ${column.secondary ? 'hidden sm:table-cell' : ''}`}
                    >
                      <div className="h-3 w-24 max-w-full rounded bg-forest-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">{empty}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className={ROW_HOVER}>
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

      <TablePagination
        caption={caption}
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        rows={rows.length}
        pending={isPending}
        onPage={onPage}
      />
    </div>
  );
}
