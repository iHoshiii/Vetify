import { MANILA_UTC_OFFSET_HOURS } from '@shared/limits';
import { currentLocalePreferences } from '@/components/providers/LocaleProvider';

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
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    currentLocalePreferences().locale,
    { ...options, timeZone: 'UTC' }
  );
}

/** The clock time of a slot, in the zone the vet set their hours in. */
export function timeOf(at: string): string {
  const { locale, timeZone } = currentLocalePreferences();
  return new Date(at).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

// 24-hour "HH:mm" in Manila, so a slot reads as a compact "10:00–10:59" range on a button.
export function clock24(at: string): string {
  const { locale, timeZone } = currentLocalePreferences();
  return new Date(at).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    hour12: false,
  });
}

// The `YYYY-MM` a day belongs to, the unit the calendar pages by.
export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

// Step whole months so navigation never lands mid-month or overflows a year.
export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
}

// The last calendar day of a month, the `to` a whole-month grid fetch asks for.
export function monthEnd(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function monthLabel(monthKey: string): string {
  return dayLabel(`${monthKey}-01`, { month: 'long', year: 'numeric' });
}

// The month laid out as a week grid: leading nulls pad to the first day's weekday.
export function monthCells(monthKey: string): (string | null)[] {
  const [year, month] = monthKey.split('-').map(Number);
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad: (string | null)[] = Array.from({ length: lead }, () => null);
  const days = Array.from(
    { length: total },
    (_unused, index) => `${monthKey}-${String(index + 1).padStart(2, '0')}`
  );
  return [...pad, ...days];
}
