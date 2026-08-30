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

/* -------------------------------------------------------------------------- *
 * What a verified professional sets about themselves
 *
 * Three settings a listing carries once the licence is checked: whether they are
 * taking work, when they are open, and how long before a consultation they want
 * telling. The rate sits with them because what it may be is decided by the
 * experience on that same licence.
 * -------------------------------------------------------------------------- */

export const PROFESSIONAL_AVAILABILITY_STATUSES = ['available', 'unavailable', 'busy'] as const;
export type ProfessionalAvailabilityStatus = (typeof PROFESSIONAL_AVAILABILITY_STATUSES)[number];

export const PROFESSIONAL_BOOKING_NOTIFICATION_TIMES = [15, 30, 60] as const;
export type ProfessionalBookingNotificationTime =
  (typeof PROFESSIONAL_BOOKING_NOTIFICATION_TIMES)[number];

export const PROFESSIONAL_MIN_RATE = 20;
export const PROFESSIONAL_BASE_RECOMMENDED_RATE = 50;
export const PROFESSIONAL_RATE_PER_YEAR = 25;
export const PROFESSIONAL_MAX_RATE_CAP = 1000;

/**
 * What the experience on the licence earns per hour: a floor of 50, and 25 a year
 * on top of it.
 *
 * A recommendation, not a limit — the cap above is the limit. Charging over this
 * is allowed and flags the listing for a reviewer, because a rate well past what
 * the record supports is the kind of thing worth a person looking at. Years are
 * clamped so a typo in a filed application cannot produce a ceiling in the
 * thousands.
 */
export function calculateMaxRecommendedRate(yearsExperience: number): number {
  const safeYears = Math.max(0, Math.min(yearsExperience, 60));
  return PROFESSIONAL_BASE_RECOMMENDED_RATE + safeYears * PROFESSIONAL_RATE_PER_YEAR;
}

/* -------------------------------------------------------------------------- *
 * Professional application, the two-stage version
 *
 * Joining is an enquiry first and an application second: a short public form a
 * reviewer reads, and — only if they invite the applicant — a longer one behind an
 * emailed link. The numbers both halves have to agree on live here.
 * -------------------------------------------------------------------------- */

/**
 * Bounds on "why do you want to join our team?" on the first form.
 *
 * A minimum because this is the whole basis for the invite decision, and a
 * two-word answer gives a reviewer nothing to decide on. Shared so the form can
 * count down to the same number the server refuses below.
 */
export const PROFESSIONAL_MOTIVATION_MIN = 40;
export const PROFESSIONAL_MOTIVATION_MAX = 800;

/** Where the applicant is now, and where they practise. Short, single-line. */
export const PROFESSIONAL_LOCATION_MAX = 160;

/**
 * How long an emailed application link stays usable.
 *
 * Long enough to survive a holiday, short enough that a forwarded or leaked link
 * is not a permanent way into somebody else's application.
 */
export const PROFESSIONAL_INVITE_DAYS = 14;

/**
 * Enquiries per IP per hour on the public first form.
 *
 * The one endpoint on this flow that anybody can reach, so it is also the one
 * that can fill a reviewer's queue with noise. Low, because a person filing a
 * second enquiry within the hour is either a typo correction or a script.
 */
export const PROFESSIONAL_INQUIRY_PER_IP_PER_HOUR = 5;

/* ---- The photographs ---- */

/**
 * The three pictures one application carries: the applicant's face, and both
 * sides of the PRC identification card.
 *
 * All three are taken through the camera rather than chosen from disk. That is a
 * product rule the browser enforces — there is no file input on the form — and the
 * server can only corroborate it, which is what the freshness window below is
 * for.
 */
export const PROFESSIONAL_PHOTO_KINDS = ['portrait', 'licenseFront', 'licenseBack'] as const;
export type ProfessionalPhotoKind = (typeof PROFESSIONAL_PHOTO_KINDS)[number];

/** The only format a capture is accepted in, so nothing has to sniff bytes. */
export const PROFESSIONAL_PHOTO_MIME = 'image/jpeg';

/**
 * Longest edge a capture is scaled to before it is encoded, and the ceiling on
 * what the encoding may weigh.
 *
 * 1600px is enough to read a licence number off an ID card, and 1.5 MB is more
 * than a JPEG of that size needs — the limit is a backstop against a caller who
 * skips the client-side encoder, not a quality target.
 */
export const PROFESSIONAL_PHOTO_MAX_EDGE = 1600;
export const PROFESSIONAL_PHOTO_MAX_BYTES = 1_500_000;

/**
 * Body ceiling for the one route that carries the captures.
 *
 * Three photographs at the limit above, base64-encoded, plus the rest of the
 * form. Deliberately its own number rather than the app-wide 1 MB: raising that
 * globally would widen every other endpoint for the sake of this one.
 */
export const PROFESSIONAL_APPLICATION_BODY_LIMIT = '8mb';

/**
 * How stale a capture may be by the time the application arrives.
 *
 * The one part of "take a photo, do not upload one" a server can actually check:
 * a picture from the camera was taken minutes ago, and a file that has been
 * sitting on a disk since last year cannot claim a timestamp inside this window
 * without the caller lying about it on purpose. Generous, because filling the
 * rest of the form takes a while and nobody should have to re-shoot three
 * pictures for being slow.
 */
export const PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES = 120;

/* ---- The addresses ---- */

/**
 * Addresses one application may carry: a home, a clinic, or both — and at least
 * one of them, because an unlocatable vet is not verifiable.
 */
export const PROFESSIONAL_MAX_ADDRESSES = 2;

/**
 * How loose a home-address fix may be and still count as one.
 *
 * The home address is taken from the device rather than typed, so it arrives with
 * the browser's own accuracy estimate attached. Above this the reading is a
 * neighbourhood rather than a house, and the form asks again instead of storing a
 * coordinate that looks precise and is not.
 */
export const PROFESSIONAL_LOCATION_MAX_ACCURACY_M = 100;

/** How long the form waits for a fix before telling the applicant it failed. */
export const PROFESSIONAL_LOCATION_TIMEOUT_MS = 20_000;

/* ---- The map ---- */

/**
 * How far out "near you" looks by default, and the furthest a caller may ask for.
 *
 * Fifty kilometres is a drive rather than a walk, and it is the radius at which a
 * search from Manila still answers for somebody in Rizal or Cavite. The cap exists
 * because the radius is the only thing bounding the work: `$geoNear` walks outwards
 * from the point until it runs out of index or of documents, so an unbounded radius
 * over a national collection is a full index scan somebody typed into a query string.
 */
export const PROFESSIONAL_NEAR_RADIUS_KM = 50;
export const PROFESSIONAL_NEAR_RADIUS_MAX_KM = 200;

/**
 * How many nearest vets an answer carries.
 *
 * A list somebody reads top to bottom rather than a directory page, and there is no
 * pager on it: the eleventh-nearest vet is not what "near you" asked for. Somebody
 * who wants to page through every vet in the country has the directory for that.
 */
export const PROFESSIONAL_NEAR_LIMIT = 10;
export const PROFESSIONAL_NEAR_LIMIT_MAX = 25;

/**
 * How many of them the panel beside the map actually shows.
 *
 * Smaller than the answer above, and a separate number because they are separate jobs.
 * That one bounds an API response, and every vet in it becomes a pin the map draws with a
 * distance on it. This one bounds a shortlist somebody reads top to bottom with a sick
 * animal in the car, and the sixth-nearest door is not what they are deciding between.
 */
export const MAP_NEAREST_LIMIT = 5;

/**
 * How close two pins have to be before they are taken to be the same building.
 *
 * The map draws Vetify's own vets over clinics scraped from OpenStreetMap, and a
 * verified clinic is frequently already an `amenity=veterinary` node there — so
 * without this the same door gets two markers. Eighty metres is wide enough to cover
 * a compound whose OSM node sits on the gate while the vet pinned the consulting
 * room, and narrow enough not to swallow the practice next door.
 */
export const MAP_DEDUP_RADIUS_M = 80;

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

/* -------------------------------------------------------------------------- *
 * Appointments
 *
 * A booking is a slot on a grid rather than a time somebody types, so the length
 * of a slot has to be one shared number: the server generates the grid from it
 * and the client labels every button with it. Two copies would be two answers to
 * what 09:30 means.
 * -------------------------------------------------------------------------- */

/**
 * How long one bookable slot is.
 *
 * A constant rather than a per-vet setting. Every professional already chooses the
 * window they work in; how finely that window is cut is a decision about the
 * product, and making it configurable would mean a grid whose shape can change
 * under a client that has already drawn it.
 */
export const APPOINTMENT_SLOT_MINUTES = 30;

/**
 * How far ahead the grid may be asked for.
 *
 * Bounded because the answer is generated a day at a time: an unbounded range is a
 * request that walks a year of schedules to fill a page nobody scrolls.
 */
export const APPOINTMENT_HORIZON_DAYS = 60;

/**
 * The offset every slot is built at.
 *
 * A professional's weekly schedule is `HH:mm` with no zone attached, and the whole
 * audience is in one country — so "09:00" means nine in Manila, and this is what
 * turns it into an instant. A fixed number rather than a timezone library because
 * the Philippines has never observed daylight saving; the day Vetify opens in a
 * second country, this is the line that has to become a real lookup.
 */
export const MANILA_UTC_OFFSET_HOURS = 8;

/**
 * How much of a reason for the visit counts as one.
 *
 * Same floor as a moderation reason and for the same kind of purpose: a vet
 * deciding whether to take a booking cannot act on "sick", and the difference
 * between a sentence and a keypress is what this number is.
 */
export const APPOINTMENT_REASON_MIN = 10;
export const APPOINTMENT_REASON_MAX = 600;

/**
 * How many bookings one network may request in an hour.
 *
 * Lower than it looks like it should be, because a request is not free to the vet:
 * it holds a slot the moment it lands. Somebody booking for three pets in one
 * sitting still fits.
 */
export const APPOINTMENT_REQUESTS_PER_IP_PER_HOUR = 8;

export const APPOINTMENT_PAGE_SIZE = 20;
export const APPOINTMENT_PAGE_SIZE_MAX = 50;
