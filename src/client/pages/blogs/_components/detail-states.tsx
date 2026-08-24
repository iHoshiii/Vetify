import { Link } from 'react-router-dom';

/** The shape of a post, before there is a post. */
export function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-6 h-9 w-4/5 rounded bg-teal-900/10" />
      <div className="mt-8 h-3 w-full rounded bg-slate-200" />
      <div className="mt-3 h-3 w-11/12 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-3/4 rounded bg-slate-200" />
    </div>
  );
}

/**
 * A slug with nothing behind it. The API answers a draft and a typo identically,
 * so this wording cannot claim the post does not exist — only that it is not here
 * to read.
 */
export function DetailMissing() {
  return (
    <div className="rounded-lg border border-teal-900/10 bg-white p-8">
      <h1 className="text-2xl font-black tracking-tight">This post is not available.</h1>
      <p className="mt-3 leading-7 text-slate-600">
        The link may be wrong, or the post may have been taken down.
      </p>
      <Link
        to="/blogs"
        className="mt-6 inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
      >
        Back to all posts
      </Link>
    </div>
  );
}

/** Anything else that went wrong on the way to the post. */
export function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-amber-900/15 bg-amber-50/70 p-8">
      <h1 className="text-2xl font-black tracking-tight">This post did not load.</h1>
      <p className="mt-3 leading-7 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
      >
        Try again
      </button>
    </div>
  );
}
