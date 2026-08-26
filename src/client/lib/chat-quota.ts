import { ANON_QUOTA_WINDOW_HOURS, FREE_ANON_QUERIES } from '@shared/limits';

/**
 * Local mirror of the anonymous allowance, used to render the countdown and to
 * stop the composer before a doomed request goes out.
 *
 * This is presentation, not enforcement. The number lives in localStorage, so
 * devtools resets it. The authoritative count is kept server-side against a
 * signed httpOnly cookie — see services/anon-quota.ts. When the two disagree,
 * the server wins and the UI is corrected by the 429 it sends back.
 *
 * The window the count belongs to is stored with it, because a count on its own
 * cannot expire. That was the bug: five questions locked the composer for good,
 * since nothing ever cleared the number and no reset was written down anywhere.
 */
export { FREE_ANON_QUERIES };

const QUOTA_STORAGE_KEY = 'vetify.chat.anonQuota';

/**
 * The key this replaced, which held a bare count. Dropped rather than migrated:
 * there is no way to tell which window such a number was spent in, and reading
 * it as a live count is exactly the permanent block being fixed. The server
 * still holds the real count, so at worst this forgives the tail of one window.
 */
const LEGACY_STORAGE_KEY = 'vetify.chat.anonCount';

/** Same window the server measures, so the two lapse together. */
const WINDOW_MS = ANON_QUOTA_WINDOW_HOURS * 60 * 60 * 1000;

type StoredQuota = {
  count: number;
  /** When the first question of this window was asked. */
  startedAt: number;
};

function read(): StoredQuota | null {
  if (typeof window === 'undefined') return null;

  window.localStorage.removeItem(LEGACY_STORAGE_KEY);

  const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Hand-edited, or written by a build that stored something else. Treat it
    // as no record and let the server correct the UI if it disagrees.
    window.localStorage.removeItem(QUOTA_STORAGE_KEY);
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const { count, startedAt } = parsed as Partial<StoredQuota>;
  if (typeof count !== 'number' || typeof startedAt !== 'number') return null;
  if (!Number.isFinite(count) || !Number.isFinite(startedAt)) return null;

  // A corrupted count should not hand out infinite questions, nor should it
  // lock anyone out — clamp into range.
  return {
    count: Math.min(Math.max(0, Math.trunc(count)), FREE_ANON_QUERIES),
    startedAt,
  };
}

/** The stored record if its window is still open, otherwise nothing. */
function liveQuota(): StoredQuota | null {
  const stored = read();
  if (!stored) return null;

  const age = Date.now() - stored.startedAt;
  // Ahead of the clock means the stamp is not trustworthy — a clock change, or
  // a hand-edited value. Either way it is not a live count.
  if (age < 0 || age >= WINDOW_MS) {
    window.localStorage.removeItem(QUOTA_STORAGE_KEY);
    return null;
  }
  return stored;
}

function write(quota: StoredQuota): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
}

export function readAnonQueryCount(): number {
  return liveQuota()?.count ?? 0;
}

export function recordAnonQuery(): number {
  const current = liveQuota();
  const next = (current?.count ?? 0) + 1;
  // The window opens on the first question and is not pushed out by later ones,
  // matching the server. A rolling window would never lapse for someone who
  // kept retrying after being refused.
  write({ count: next, startedAt: current?.startedAt ?? Date.now() });
  return next;
}

export function resetAnonQueryCount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QUOTA_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function anonQueriesRemaining(): number {
  return Math.max(0, FREE_ANON_QUERIES - readAnonQueryCount());
}

/**
 * Called when the server reports the allowance is gone. Pins the local counter
 * to the cap so the UI agrees with the server even if storage was cleared.
 *
 * Keeps the window it is already in, so the pin lapses when the server's count
 * does. With no live record — storage cleared, another browser — the window can
 * only be assumed to start now, which locks the composer for up to a day rather
 * than forever.
 */
export function markAnonQuotaExhausted(): void {
  const current = liveQuota();
  write({ count: FREE_ANON_QUERIES, startedAt: current?.startedAt ?? Date.now() });
}
