import { APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';
import { describe, expect, it } from 'vitest';

import { isOfferedSlot, manilaDay, slotsForRange } from '../appointment-slots';

/** A Thursday, chosen so the weekday lookup has to actually work. */
const THURSDAY = '2026-09-03';

/** Well before any date under test, so nothing is dropped for being past. */
const LAST_YEAR = new Date('2025-01-01T00:00:00.000Z');

function schedule(overrides: Partial<WeeklyScheduleItem> = {}): WeeklyScheduleItem[] {
  return [
    { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '11:00', ...overrides },
  ] as WeeklyScheduleItem[];
}

function starts(input: {
  schedule?: WeeklyScheduleItem[];
  from?: string;
  to?: string;
  held?: Date[];
  now?: Date;
}) {
  const [day] = slotsForRange({
    schedule: input.schedule ?? schedule(),
    from: input.from ?? THURSDAY,
    to: input.to ?? input.from ?? THURSDAY,
    minutes: APPOINTMENT_SLOT_MINUTES,
    held: input.held ?? [],
    now: input.now ?? LAST_YEAR,
  });

  return day.slots;
}

describe('slotsForRange', () => {
  it('cuts the working window into slots', () => {
    // 09:00 to 11:00 in half hours is four starts, the last of them 10:30.
    expect(starts({}).map((slot) => slot.at)).toEqual([
      '2026-09-03T01:00:00.000Z',
      '2026-09-03T01:30:00.000Z',
      '2026-09-03T02:00:00.000Z',
      '2026-09-03T02:30:00.000Z',
    ]);
  });

  it('reads the schedule as Manila time, so 09:00 is 01:00Z', () => {
    // The whole reason the offset constant exists. A grid built in UTC would offer
    // a vet's morning to nobody and their evening to everybody.
    expect(starts({})[0].at).toBe('2026-09-03T01:00:00.000Z');
  });

  it('will not offer a slot that runs past closing time', () => {
    // 09:00-10:15 fits two half hours, not two and a half: a consultation offered
    // at 10:00 against a 10:15 close is one the vet finds out about on the day.
    const slots = starts({ schedule: schedule({ endTime: '10:15' }) });

    expect(slots).toHaveLength(2);
    expect(slots.at(-1)?.at).toBe('2026-09-03T01:30:00.000Z');
  });

  it('offers nothing on a day the vet switched off', () => {
    expect(starts({ schedule: schedule({ enabled: false }) })).toEqual([]);
  });

  it('offers nothing on a weekday the schedule never mentions', () => {
    // A Friday, against a schedule that only names Thursday. Not saying is not the
    // same as saying yes.
    expect(starts({ from: '2026-09-04' })).toEqual([]);
  });

  it('offers nothing at all when there is no schedule', () => {
    expect(starts({ schedule: [] })).toEqual([]);
  });

  it('offers nothing for a window that ends before it starts', () => {
    expect(starts({ schedule: schedule({ startTime: '17:00', endTime: '09:00' }) })).toEqual([]);
  });

  it('marks the slots somebody already holds', () => {
    const slots = starts({ held: [new Date('2026-09-03T01:30:00.000Z')] });

    expect(slots.map((slot) => slot.taken)).toEqual([false, true, false, false]);
  });

  it('drops what is already past, so a stale request stops blocking on its own', () => {
    const slots = starts({ now: new Date('2026-09-03T02:00:00.000Z') });

    expect(slots.map((slot) => slot.at)).toEqual([
      '2026-09-03T02:00:00.000Z',
      '2026-09-03T02:30:00.000Z',
    ]);
  });

  it('answers a day per day asked for, working or not', () => {
    const days = slotsForRange({
      schedule: schedule(),
      from: THURSDAY,
      to: '2026-09-05',
      minutes: APPOINTMENT_SLOT_MINUTES,
      held: [],
      now: LAST_YEAR,
    });

    expect(days.map((day) => day.date)).toEqual(['2026-09-03', '2026-09-04', '2026-09-05']);
    // Only the Thursday is worked, and the empty days say so rather than being absent.
    expect(days.map((day) => day.slots.length)).toEqual([4, 0, 0]);
  });

  it('bounds a range nobody could scroll', () => {
    const days = slotsForRange({
      schedule: schedule(),
      from: THURSDAY,
      to: '2030-01-01',
      minutes: APPOINTMENT_SLOT_MINUTES,
      held: [],
      now: LAST_YEAR,
    });

    expect(days).toHaveLength(60);
  });
});

describe('manilaDay', () => {
  it('reads an evening instant as the Manila date it falls on', () => {
    // 22:30Z on the 3rd is 06:30 on the 4th in Manila. A grid that got this wrong
    // would file a booking under the day before it happens.
    expect(manilaDay(new Date('2026-09-03T22:30:00.000Z'))).toBe('2026-09-04');
  });
});

describe('isOfferedSlot', () => {
  const offered = (startsAt: string, now = LAST_YEAR) =>
    isOfferedSlot({
      schedule: schedule(),
      startsAt: new Date(startsAt),
      minutes: APPOINTMENT_SLOT_MINUTES,
      now,
    });

  it('accepts a start the grid would have shown', () => {
    expect(offered('2026-09-03T01:30:00.000Z')).toBe(true);
  });

  it('refuses a time in the middle of a slot', () => {
    // The case this guard exists for: a client posting its own idea of a time
    // rather than one of the ones offered.
    expect(offered('2026-09-03T01:17:00.000Z')).toBe(false);
  });

  it('refuses a start outside the working window', () => {
    expect(offered('2026-09-03T08:00:00.000Z')).toBe(false);
  });

  it('refuses a start on a day the vet does not work', () => {
    expect(offered('2026-09-04T01:00:00.000Z')).toBe(false);
  });

  it('refuses a start that has already passed', () => {
    expect(offered('2026-09-03T01:00:00.000Z', new Date('2026-09-03T01:30:00.000Z'))).toBe(false);
  });
});
