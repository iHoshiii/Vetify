/** Long enough for a real headline, short enough to stay a readable URL. */
export const SLUG_MAX_LENGTH = 80;

/** What an unsluggable title falls back to, so a post is never left without a URL. */
export const SLUG_FALLBACK = 'post';

/**
 * Turns a title into the ASCII form a URL can carry: accents folded onto their
 * base letter, everything else collapsed to single dashes.
 *
 * A title written entirely in a non-Latin script has nothing left after that and
 * comes back as `SLUG_FALLBACK`. That is a real limitation rather than an
 * oversight — the alternative is percent-encoded URLs nobody can read or share.
 * `insertBlog` disambiguates the collisions that follow, so the posts still get
 * distinct addresses.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD') // splits é into e + a combining accent
    .replace(/[\u0300-\u036f]/g, '') // …which this then drops
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    // The slice above can leave a dash hanging off the end.
    .replace(/-+$/g, '');

  return slug || SLUG_FALLBACK;
}
