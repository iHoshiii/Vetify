import { APPOINTMENT_MAX_SLOTS } from '@shared/limits';

import { timeOf } from './slot-time';

type Slot = { at: string; taken: boolean };

/**
 * What a click leaves selected, given what already is.
 *
 * A visit is one hour by default and at most two adjacent ones, so the only extend on
 * offer is the hour immediately after the current pick — anything else starts a fresh
 * one-hour selection. Kept pure and away from the component so the rule is testable on
 * its own.
 */
export function nextSelection(picked: string[], slot: Slot, minutes: number): string[] {
  if (slot.taken) return picked;
  // Tapping an hour already in the run shortens it to end there: that hour and every one
  // after it let go, so tapping the only pick clears it and tapping the last drops one.
  const at = picked.indexOf(slot.at);
  if (at !== -1) return picked.slice(0, at);

  const last = picked.at(-1);
  const adjacent =
    last !== undefined &&
    new Date(slot.at).getTime() - new Date(last).getTime() === minutes * 60_000;

  // The only extend on offer is the hour right after the run, and only up to a day.
  // Anything else starts a fresh one-hour pick.
  if (adjacent && picked.length < APPOINTMENT_MAX_SLOTS) return [...picked, slot.at];
  return [slot.at];
}

/** A one-line read-out of the picked hours, e.g. "09:00 – 11:00 · 2 hours". */
export function spanLabel(picked: string[], minutes: number): string {
  if (picked.length === 0) return '';
  const endsAt = new Date(new Date(picked.at(-1)!).getTime() + minutes * 60_000).toISOString();
  const hours = picked.length === 1 ? '1 hour' : `${picked.length} hours`;
  return `${timeOf(picked[0])} – ${timeOf(endsAt)} · ${hours}`;
}
