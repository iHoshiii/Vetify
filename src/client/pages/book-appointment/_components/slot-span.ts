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
  // Clicking the lone pick again clears it; clicking either end of a two-hour run drops
  // back to the one hour it started as.
  if (picked.length === 1 && picked[0] === slot.at) return [];
  if (picked.includes(slot.at)) return [picked[0]];

  const last = picked.at(-1);
  const adjacent =
    last !== undefined &&
    new Date(slot.at).getTime() - new Date(last).getTime() === minutes * 60_000;

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
