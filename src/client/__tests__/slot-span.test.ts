import { describe, expect, it } from 'vitest';

import {
  runsOf,
  slotRangeLabel,
  toggleSlot,
} from '../pages/book-appointment/_components/slot-span';

const AT_9 = '2026-09-03T01:00:00.000Z';
const AT_10 = '2026-09-03T02:00:00.000Z';
const AT_11 = '2026-09-03T03:00:00.000Z';
const AT_13 = '2026-09-03T05:00:00.000Z';
const free = (at: string) => ({ at, taken: false });

describe('toggleSlot', () => {
  it('adds a free hour when it is not picked', () => {
    expect(toggleSlot([], free(AT_9))).toEqual([AT_9]);
  });

  it('removes an hour that is already picked, leaving the rest', () => {
    expect(toggleSlot([AT_9, AT_10], free(AT_9))).toEqual([AT_10]);
  });

  it('keeps the picks sorted so a later hour lands in order', () => {
    expect(toggleSlot([AT_11], free(AT_9))).toEqual([AT_9, AT_11]);
  });

  it('adds an hour that does not touch the rest — order does not matter', () => {
    expect(toggleSlot([AT_9], free(AT_13))).toEqual([AT_9, AT_13]);
  });

  it('ignores a taken hour', () => {
    expect(toggleSlot([AT_9], { at: AT_11, taken: true })).toEqual([AT_9]);
  });
});

describe('runsOf', () => {
  it('groups hours in a row into one run', () => {
    expect(runsOf([AT_9, AT_10, AT_11], 60)).toEqual([{ startsAt: AT_9, slots: 3 }]);
  });

  it('splits a gap into separate runs, each its own booking', () => {
    // 09,10 sit together; 13 is two hours off, so it books on its own.
    expect(runsOf([AT_9, AT_10, AT_13], 60)).toEqual([
      { startsAt: AT_9, slots: 2 },
      { startsAt: AT_13, slots: 1 },
    ]);
  });

  it('reads unsorted picks the same as sorted ones', () => {
    expect(runsOf([AT_13, AT_9, AT_10], 60)).toEqual([
      { startsAt: AT_9, slots: 2 },
      { startsAt: AT_13, slots: 1 },
    ]);
  });

  it('is empty when nothing is picked', () => {
    expect(runsOf([], 60)).toEqual([]);
  });
});

describe('slotRangeLabel', () => {
  it('reads an hour as the range it fills, to a minute before the next', () => {
    expect(slotRangeLabel(AT_9, 60)).toBe('09:00–09:59');
  });
});
