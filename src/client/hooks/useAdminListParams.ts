import { useSearchParams } from 'react-router-dom';

/** `?page=abc` and `?page=-4` both mean the first page, not an error. */
function pageFrom(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/**
 * Narrow a URL string to a value the server's enum actually contains.
 *
 * A hand-typed `?role=wizard` is dropped here rather than sent and refused: the
 * filter is the user's own address bar, and a 400 is a poor answer to a typo in it.
 */
export function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/**
 * The admin lists keep their filters in the URL.
 *
 * Which means a moderator can bookmark the pending queue, the back button undoes
 * a filter, and a link to "banned accounts, page 2" is a link somebody can send.
 * The alternative — component state — loses all three on a reload.
 */
export function useAdminListParams() {
  const [params, setParams] = useSearchParams();

  function get(key: string): string | undefined {
    return params.get(key) ?? undefined;
  }

  /**
   * Writes a patch back, dropping empties.
   *
   * Any change other than paging clears the page, because page 3 of an unfiltered
   * list is not page 3 of a filtered one — staying on it lands on an empty table
   * that looks like "no results".
   */
  function set(patch: Record<string, string | number | undefined>): void {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      const empty = value === undefined || value === '' || (key === 'page' && value === 1);
      if (empty) next.delete(key);
      else next.set(key, String(value));
    }

    if (!('page' in patch)) next.delete('page');

    setParams(next);
  }

  return { page: pageFrom(params.get('page')), get, set };
}
