const PILL = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold';

/**
 * One map for account, post and application statuses.
 *
 * They are three separate vocabularies on the server and deliberately one here:
 * the colour says how much attention a row wants, and 'suspended' means the same
 * amount of it whether the thing suspended is a person or a listing. 'suspended'
 * genuinely appears in two of the three enums, so a map per collection would have
 * had to agree with itself anyway.
 */
const TONE: Record<string, string> = {
  // Fine.
  active: 'bg-emerald-100 text-emerald-900',
  published: 'bg-emerald-100 text-emerald-900',
  verified: 'bg-emerald-100 text-emerald-900',
  // Waiting on somebody.
  pending: 'bg-amber-100 text-amber-900',
  flagged: 'bg-amber-100 text-amber-900',
  draft: 'bg-slate-100 text-slate-700',
  // Acted on, reversibly.
  hidden: 'bg-orange-100 text-orange-900',
  suspended: 'bg-orange-100 text-orange-900',
  // Acted on, and meant.
  banned: 'bg-rose-100 text-rose-900',
  removed: 'bg-rose-100 text-rose-900',
  rejected: 'bg-rose-100 text-rose-900',
};

const FALLBACK = 'bg-slate-100 text-slate-700';

/**
 * Where a row stands, as a pill.
 *
 * An unrecognised status renders in the neutral tone with its own name rather than
 * disappearing: a status the client has not been taught is exactly the thing an
 * admin should still be able to see.
 */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${PILL} ${TONE[status] ?? FALLBACK}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
