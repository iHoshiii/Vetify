import type { AdminBlogModeration } from '@/services/admin.service';

const CHIP = 'rounded px-1.5 py-0.5 text-[11px] font-bold';

/**
 * Held, and not yet looked at by anybody, is the state this whole surface exists
 * to drain — so it is the one that gets the loud colour. Once somebody has
 * decided, the same note stays on the row in grey: it is then a record of why the
 * post was ever here, not a request.
 */
const TONE = {
  waiting: 'border-amber-300/70 bg-amber-50 text-amber-900',
  reviewed: 'border-slate-200 bg-slate-50 text-slate-600',
};

/**
 * Why the screen stopped this post.
 *
 * Shows the terms as well as the categories, because deciding whether a flag is a
 * false positive means seeing the actual word rather than a label describing the
 * kind of word it was. 'unavailable' is spelled out rather than shown as a
 * category, since "we could not check this" is a different thing to tell a
 * reviewer than "we checked it and it is bad".
 */
export function ModerationNote({ moderation }: { moderation: AdminBlogModeration | null }) {
  if (!moderation || moderation.outcome === 'clean') return null;

  const waiting = moderation.reviewedAt === null;
  const percent = Math.round(moderation.severity * 100);

  return (
    <div className={`mt-2 rounded-md border p-2 ${waiting ? TONE.waiting : TONE.reviewed}`}>
      <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
        {moderation.outcome === 'unavailable' ? 'Not screened' : 'Flagged'}
        {moderation.categories.map((category) => (
          <span key={category} className={`${CHIP} bg-white/70`}>
            {category}
          </span>
        ))}
        {moderation.outcome === 'flagged' && <span className="font-bold">{percent}%</span>}
        {!waiting && <span className="font-bold normal-case">· reviewed</span>}
      </p>

      {moderation.notes && <p className="mt-1 text-xs font-semibold">{moderation.notes}</p>}

      {moderation.terms.length > 0 && (
        <p className="mt-1 text-xs">
          Matched: <span className="font-bold">{moderation.terms.join(', ')}</span>
        </p>
      )}
    </div>
  );
}
