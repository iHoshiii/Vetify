import { describe, expect, it } from 'vitest';

import { nextSelection, spanLabel } from '../pages/book-appointment/_components/slot-span';

const AT_9 = '2026-09-03T01:00:00.000Z';
const AT_10 = '2026-09-03T02:00:00.000Z';
const AT_11 = '2026-09-03T03:00:00.000Z';
const free = (at: string) => ({ at, taken: false });

describe('nextSelection', () => {
  it('picks a free hour when nothing is picked yet', () => {
    expect(nextSelection([], free(AT_9), 60)).toEqual([AT_9]);
  });

  it('extends onto the very next hour, for a two-hour visit', () => {
    expect(nextSelection([AT_9], free(AT_10), 60)).toEqual([AT_9, AT_10]);
  });

  it('will not run past two hours', () => {
    // The third hour is not an extend: it starts a fresh one-hour pick.
    expect(nextSelection([AT_9, AT_10], free(AT_11), 60)).toEqual([AT_11]);
  });

  it('starts over on an hour that does not touch the pick', () => {
    expect(nextSelection([AT_9], free(AT_11), 60)).toEqual([AT_11]);
  });

  it('clears when the only picked hour is tapped again', () => {
    expect(nextSelection([AT_9], free(AT_9), 60)).toEqual([]);
  });

  it('drops back to one hour when either end of a two-hour pick is tapped', () => {
    expect(nextSelection([AT_9, AT_10], free(AT_10), 60)).toEqual([AT_9]);
  });

  it('ignores a taken hour', () => {
    expect(nextSelection([AT_9], { at: AT_10, taken: true }, 60)).toEqual([AT_9]);
  });
});

describe('spanLabel', () => {
  it('reads one picked hour as a single hour to its close', () => {
    expect(spanLabel([AT_9], 60)).toMatch(/1 hour$/);
  });

  it('reads two picked hours as two, spanning to the later close', () => {
    expect(spanLabel([AT_9, AT_10], 60)).toMatch(/2 hours$/);
  });

  it('is empty when nothing is picked', () => {
    expect(spanLabel([], 60)).toBe('');
  });
});
