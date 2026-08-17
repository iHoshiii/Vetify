/**
 * Limits shared by both halves of the app, so the number the UI counts down
 * from cannot drift from the number the server enforces.
 */

/** Questions an unauthenticated visitor may ask the assistant per window. */
export const FREE_ANON_QUERIES = 5;

/**
 * Window the free questions are counted in, measured from the first question
 * rather than the last. A rolling window would never lapse for someone who kept
 * retrying after being refused, which is the opposite of a daily allowance.
 */
export const ANON_QUOTA_WINDOW_HOURS = 24;

/**
 * Lifetime of the cookie that identifies an anonymous visitor. Deliberately far
 * longer than the quota window: the cookie is the identity, the usage record is
 * the allowance. Letting the identity expire alongside the window would make
 * the reset depend on the browser's clock rather than the server's.
 */
export const ANON_COOKIE_DAYS = 365;

/**
 * Per-IP ceiling for unauthenticated chat, per hour. Deliberately looser than
 * FREE_ANON_QUERIES: the cookie counter is the per-person rule, while this is
 * only an abuse ceiling. Matching them would punish everyone behind a shared
 * NAT — a household, an office, a campus — for one person's allowance.
 */
export const ANON_CHAT_PER_IP_PER_HOUR = 30;
