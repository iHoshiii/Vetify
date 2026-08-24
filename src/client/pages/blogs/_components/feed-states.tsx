import { Link } from 'react-router-dom';

/**
 * Placeholder cards, shaped like the real ones so the grid does not jump when the
 * feed arrives. Hidden from assistive tech — there is nothing here to read yet.
 */
export function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((n) => (
        <article key={n} aria-hidden="true" className="animate-pulse bg-white p-6">
          <div className="h-5 w-3/4 rounded bg-teal-900/10" />
          <div className="mt-4 h-3 w-full rounded bg-slate-200" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-200" />
          <div className="mt-5 h-3 w-24 rounded bg-slate-200" />
        </article>
      ))}
    </>
  );
}

/** A failed fetch, with the retry the query already knows how to do. */
export function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-10 rounded-lg border border-amber-900/15 bg-amber-50/70 p-6 text-slate-950"
    >
      <h2 className="text-lg font-black tracking-tight">These posts did not load.</h2>
      <p className="mt-2 leading-7 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
      >
        Try again
      </button>
    </div>
  );
}

/** Nothing to show. Says which of the two reasons it is, since they differ. */
export function FeedEmpty({ tag }: { tag?: string }) {
  return (
    <div className="mt-10 rounded-lg border border-teal-900/10 bg-white p-6">
      <h2 className="text-lg font-black tracking-tight">
        {tag ? `Nothing tagged “${tag}” yet.` : 'No posts published yet.'}
      </h2>
      <p className="mt-2 leading-7 text-slate-600">
        {tag ? (
          <>
            Other topics may have something.{' '}
            <Link to="/blogs" className="font-bold text-teal-800 hover:underline">
              See every post
            </Link>
            .
          </>
        ) : (
          'New notes on everyday pet care will appear here as they are written.'
        )}
      </p>
    </div>
  );
}
