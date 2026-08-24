type BlogPaginationProps = {
  page: number;
  pages: number;
  onPage: (page: number) => void;
};

const BUTTON =
  'rounded-md border border-teal-900/15 bg-white px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-900/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

/** Prev/next paging. Absent entirely when there is only one page to be on. */
export function BlogPagination({ page, pages, onPage }: BlogPaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Blog pages" className="mt-10 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={BUTTON}
      >
        Previous
      </button>

      {/* Announced on change, so paging is audible without moving focus. */}
      <p aria-live="polite" className="text-sm font-semibold text-slate-600">
        Page {page} of {pages}
      </p>

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className={BUTTON}
      >
        Next
      </button>
    </nav>
  );
}
