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

/**
 * Posts per page on the public blog list, and the ceiling a caller may ask for.
 *
 * Shared because both halves have to agree on it: the client renders a pager
 * from `pages` in the response, and the server refuses anything above the max so
 * `?limit=100000` cannot turn a paginated endpoint back into an unbounded scan.
 */
export const BLOG_PAGE_SIZE = 9;
export const BLOG_PAGE_SIZE_MAX = 50;

/** Tags allowed on one post. Enough to categorise, few enough to stay a filter. */
export const BLOG_MAX_TAGS = 8;
/**
 * Directory page size, and the ceiling a caller may ask for. Same reasoning as
 * the blog pager: the client draws its pages from the response, and the server
 * refuses anything larger, so `?limit=100000` cannot un-paginate the endpoint.
 */
export const PROFESSIONAL_PAGE_SIZE = 12;
export const PROFESSIONAL_PAGE_SIZE_MAX = 50;

/** Specialties one vet may claim. A profile that lists everything says nothing. */
export const PROFESSIONAL_MAX_SPECIALTIES = 6;

/**
 * Credential links one application may carry - licence, diploma, board
 * certifications. Enough for the eligibility list the site already publishes,
 * few enough that a reviewer can realistically open them all.
 */
export const PROFESSIONAL_MAX_CREDENTIALS = 5;

/**
 * Bounds on the introduction shown in the directory. Shared because the form
 * counts characters against the same minimum the server rejects below.
 */
export const PROFESSIONAL_BIO_MIN = 80;
export const PROFESSIONAL_BIO_MAX = 1200;

/**
 * Rows per page on the admin lists, and the ceiling a caller may ask for.
 *
 * Smaller than the public pagers on purpose: these rows are wide — a user row
 * carries a role, a status, a provider and three dates — and an admin scanning
 * for one account pages through rather than scrolls. The max is what stops a
 * hand-written `?limit=100000` from turning the user list into a full scan.
 */
export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_PAGE_SIZE_MAX = 100;

/**
 * How long a raw activity event is kept before the TTL sweep drops it.
 *
 * Long enough to cover the dashboard's widest window, short enough that the
 * collection cannot grow without bound. The counts that must outlive it — "users
 * who ever signed up" — are read from the collections themselves rather than from
 * events, so nothing permanent depends on this number.
 */
export const ACTIVITY_RETENTION_DAYS = 90;

/**
 * Widest window a chart may ask for, and the one the dashboard opens on.
 *
 * The maximum is the retention window rather than a number of its own: a chart
 * cannot honestly reach further back than the events exist, and asking for a year
 * would draw a line that is real for 90 days and flat zero before it — which
 * reads as "nothing happened" rather than "nothing was kept".
 */
export const METRIC_MAX_DAYS = ACTIVITY_RETENTION_DAYS;
export const METRIC_WINDOW_DAYS = 30;

/**
 * How much of an explanation counts as one, on any moderation decision.
 *
 * Shared so the confirm dialog can hold the button until the box is long enough,
 * rather than letting somebody type 'no' and learn from a 400 that it was not
 * enough. Ten characters is not a quality bar — it is the difference between a
 * stated reason and a keypress, which is what the audit entry has to show months
 * later.
 */
export const MODERATION_REASON_MIN = 10;
export const MODERATION_REASON_MAX = 500;
