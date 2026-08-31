import { MANILA_UTC_OFFSET_HOURS } from '@shared/limits';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Today in Manila, since the server cuts the grid into Manila days. */
export function manilaToday(): string {
  return new Date(Date.now() + MANILA_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` read as a Manila date, for labelling only. */
export function dayLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-PH', {
    ...options,
    timeZone: 'UTC',
  });
}

/** The clock time of a slot, in the zone the vet set their hours in. */
export function timeOf(at: string): string {
  return new Date(at).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}
