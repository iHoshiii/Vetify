import { describe, expect, it } from 'vitest';

import { nextSelection, spanLabel } from '../pages/book-appointment/_components/slot-span';

const AT_9 = '2026-09-03T01:00:00.000Z';
const AT_10 = '2026-09-03T02:00:00.000Z';
const AT_11 = '2026-09-03T03:00:00.000Z';
const AT_12 = '2026-09-03T04:00:00.000Z';
const free = (at: string) => ({ at, taken: false });

describe('nextSelection', () => {
  it('picks a free hour when nothing is picked yet', () => {
    expect(nextSelection([], free(AT_9), 60)).toEqual([AT_9]);
  });

  it('extends onto the very next hour', () => {
    expect(nextSelection([AT_9], free(AT_10), 60)).toEqual([AT_9, AT_10]);
  });

  it('keeps extending, so a run can be as long as the vet works', () => {
    expect(nextSelection([AT_9, AT_10], free(AT_11), 60)).toEqual([AT_9, AT_10, AT_11]);
  });

  it('starts over on an hour that does not touch the pick', () => {
    expect(nextSelection([AT_9], free(AT_11), 60)).toEqual([AT_11]);
  });

  it('clears when the only picked hour is tapped again', () => {
    expect(nextSelection([AT_9], free(AT_9), 60)).toEqual([]);
  });

  it('shortens the run to end where a picked hour is tapped', () => {
    // Tapping 10:00 in a 09:00–12:00 run drops it and everything after: back to one hour.
    expect(nextSelection([AT_9, AT_10, AT_11], free(AT_10), 60)).toEqual([AT_9]);
  });

  it('drops just the last hour when the end of a run is tapped', () => {
    expect(nextSelection([AT_9, AT_10, AT_11], free(AT_11), 60)).toEqual([AT_9, AT_10]);
  });

  it('ignores a taken hour', () => {
    expect(nextSelection([AT_9], { at: AT_12, taken: true }, 60)).toEqual([AT_9]);
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
