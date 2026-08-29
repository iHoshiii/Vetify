import { APPOINTMENT_HORIZON_DAYS, MANILA_UTC_OFFSET_HOURS } from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';

/**
 * Turning a vet's weekly schedule into the slots somebody can actually click.
 *
 * Pure and synchronous: it is handed the schedule, the days asked for and the slots
 * already held, and it answers. Nothing here reads the clock except through `now`,
 * which is a parameter so a test can stand anywhere in the week.
 *
 * The grid is generated rather than stored, and that is the point. A stored grid is a
 * second copy of the schedule, wrong from the moment a vet changes their hours, and
 * every slot in it is a row nobody booked.
 */

/** One bookable start, and whether somebody already has it. */
export type Slot = {
  /** The instant, as the client will send it back. */
  at: string;
  taken: boolean;
};

export type DaySlots = {
  /** The Manila calendar day, `YYYY-MM-DD`. */
  date: string;
  slots: Slot[];
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Index order matches `Date.prototype.getUTCDay`, which starts on Sunday. */
const DAY_NAMES: WeeklyScheduleItem['day'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * A `YYYY-MM-DD` and an `HH:mm`, read as Manila time, as an instant.
 *
 * The offset is a constant rather than a timezone lookup — see
 * MANILA_UTC_OFFSET_HOURS for why that is safe here and what breaks it.
 */
function manilaInstant(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour - MANILA_UTC_OFFSET_HOURS, minute));
}

/** The Manila calendar day an instant falls on. */
export function manilaDay(at: Date): string {
  return new Date(at.getTime() + MANILA_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

/**
 * Which weekday a Manila calendar date is.
 *
 * Read off midnight UTC of the same date rather than off a shifted instant: the
 * string is already a Manila date, so its weekday is a fact about the calendar and
 * not about any timezone.
 */
function weekdayOf(date: string): WeeklyScheduleItem['day'] {
  const [year, month, day] = date.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * The days in an inclusive range, bounded by the horizon.
 *
 * Bounded here rather than trusted from the query, because the cost of the answer is
 * one day's arithmetic per day asked for and a year-long range is a request nobody's
 * screen can use.
 */
function daysBetween(from: string, to: string): string[] {
  const start = manilaInstant(from, '00:00').getTime();
  const end = manilaInstant(to, '00:00').getTime();
  const days: string[] = [];

  for (let at = start; at <= end && days.length < APPOINTMENT_HORIZON_DAYS; at += DAY_MS) {
    days.push(manilaDay(new Date(at)));
  }

  return days;
}

/** The window a vet works on one weekday, or null when they do not work it. */
function windowFor(
  schedule: WeeklyScheduleItem[],
  date: string
): { startTime: string; endTime: string } | null {
  const day = weekdayOf(date);
  const entry = schedule.find((item) => item.day === day);

  // No entry at all means the vet never said, which is not the same as saying yes.
  // An absent schedule offers nothing rather than a default working week: a booking
  // the vet never agreed to be available for is worse than an empty grid.
  if (!entry || !entry.enabled) return null;

  return { startTime: entry.startTime, endTime: entry.endTime };
}

export type SlotsInput = {
  schedule: WeeklyScheduleItem[];
  /** Inclusive Manila calendar days, `YYYY-MM-DD`. */
  from: string;
  to: string;
  minutes: number;
  /** The starts already spoken for, as `findHeldSlots` returns them. */
  held: Date[];
  now?: Date;
};

/**
 * The grid for a range of days.
 *
 * A slot has to *end* inside the working window, not merely start in it — a 30
 * minute consultation offered at 16:45 against a 17:00 close is a slot that runs
 * over, and the vet would find out on the day.
 *
 * Anything already past is dropped rather than shown disabled. A slot that cannot be
 * booked by anybody is not information; and it is what stops an unanswered request
 * blocking a time forever, because once the time passes it leaves the grid on its
 * own.
 */
export function slotsForRange(input: SlotsInput): DaySlots[] {
  const { schedule, from, to, minutes, held, now = new Date() } = input;

  const taken = new Set(held.map((at) => at.getTime()));
  const floor = now.getTime();

  return daysBetween(from, to).map((date) => {
    const window = windowFor(schedule, date);
    if (!window) return { date, slots: [] };

    const opens = manilaInstant(date, window.startTime).getTime();
    const closes = manilaInstant(date, window.endTime).getTime();
    const slots: Slot[] = [];

    // A window that ends before it starts produces nothing. Not an error: the
    // settings tray lets a vet save one, and an empty day is a truer answer than a
    // grid running backwards through the night.
    for (let at = opens; at + minutes * MINUTE_MS <= closes; at += minutes * MINUTE_MS) {
      if (at < floor) continue;
      slots.push({ at: new Date(at).toISOString(), taken: taken.has(at) });
    }

    return { date, slots };
  });
}

/**
 * Whether an instant is one the grid would have offered, held or not.
 *
 * The service asks this instead of trusting the `startsAt` it was sent: the grid is
 * generated, so a client that posts 03:17 has posted a time no vet ever offered.
 * Answered by regenerating that one day rather than by arithmetic of its own, so
 * there is a single definition of "a slot" and not two that can drift apart.
 */
export function isOfferedSlot(input: {
  schedule: WeeklyScheduleItem[];
  startsAt: Date;
  minutes: number;
  now?: Date;
}): boolean {
  const date = manilaDay(input.startsAt);
  const [day] = slotsForRange({
    schedule: input.schedule,
    from: date,
    to: date,
    minutes: input.minutes,
    held: [],
    now: input.now,
  });

  const wanted = input.startsAt.toISOString();
  return Boolean(day?.slots.some((slot) => slot.at === wanted));
}
