/**
 * Limits shared by both halves of the app, so the number the UI counts down
 * from cannot drift from the number the server enforces.
 */

/** Questions an unauthenticated visitor may ask the assistant. */
export const FREE_ANON_QUERIES = 5;

/**
 * Per-IP ceiling for unauthenticated chat, per hour. Deliberately looser than
 * FREE_ANON_QUERIES: the cookie counter is the per-person rule, while this is
 * only an abuse ceiling. Matching them would punish everyone behind a shared
 * NAT — a household, an office, a campus — for one person's allowance.
 */
export const ANON_CHAT_PER_IP_PER_HOUR = 30;

/** How long an anonymous visitor's usage record is kept before it lapses. */
export const ANON_USAGE_TTL_DAYS = 30;
