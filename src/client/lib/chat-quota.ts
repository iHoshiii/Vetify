/**
 * Free-question allowance for visitors who have not signed in.
 *
 * IMPORTANT: this is a client-side courtesy limit, not a security control. It
 * lives in localStorage, so anyone willing to open devtools can reset it. The
 * chat endpoint still costs real money per call, so a server-side quota is the
 * thing that actually protects the Gemini budget — see the notes in the PR
 * description. Do not treat this file as enforcement.
 */
export const FREE_ANON_QUERIES = 5;

const QUOTA_STORAGE_KEY = 'vetify.chat.anonCount';

export function readAnonQueryCount(): number {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  // A hand-edited or corrupted value should not hand out infinite questions,
  // nor should it lock someone out — clamp into range.
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, FREE_ANON_QUERIES);
}

export function recordAnonQuery(): number {
  const next = readAnonQueryCount() + 1;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QUOTA_STORAGE_KEY, String(next));
  }
  return next;
}

export function resetAnonQueryCount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QUOTA_STORAGE_KEY);
}

export function anonQueriesRemaining(): number {
  return Math.max(0, FREE_ANON_QUERIES - readAnonQueryCount());
}
