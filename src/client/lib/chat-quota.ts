import { FREE_ANON_QUERIES } from '@shared/limits';

/**
 * Local mirror of the anonymous allowance, used to render the countdown and to
 * stop the composer before a doomed request goes out.
 *
 * This is presentation, not enforcement. The number lives in localStorage, so
 * devtools resets it. The authoritative count is kept server-side against a
 * signed httpOnly cookie — see services/anon-quota.ts. When the two disagree,
 * the server wins and the UI is corrected by the 429 it sends back.
 */
export { FREE_ANON_QUERIES };

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

/**
 * Called when the server reports the allowance is gone. Pins the local counter
 * to the cap so the UI agrees with the server even if storage was cleared.
 */
export function markAnonQuotaExhausted(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUOTA_STORAGE_KEY, String(FREE_ANON_QUERIES));
}
