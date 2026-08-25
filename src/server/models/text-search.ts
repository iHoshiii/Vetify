/**
 * Turns a search box into something safe to hand a regex engine.
 *
 * Without this, a search of `.*` is a filter that matches every row and `(` is an
 * unterminated group the driver rejects — a search field is user input, and the
 * query language it lands in is not one it should be able to write.
 *
 * Shared by the admin reads rather than copied into each: an escape that is
 * correct in one collection and slightly wrong in another is the kind of bug
 * nobody finds until somebody searches for a bracket.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
