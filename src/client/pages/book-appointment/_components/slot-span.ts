import { APPOINTMENT_MAX_SLOTS } from '@shared/limits';

import { clock24 } from './slot-time';

type Slot = { at: string; taken: boolean };

// One contiguous run of hours: where it starts and how many slots it covers. Each run books on its own.
export type Run = { startsAt: string; slots: number };

const MINUTE_MS = 60_000;

// A tap toggles an hour on or off, any hour, in any order. Sorted so grouping into runs is a scan.
export function toggleSlot(picked: string[], slot: Slot): string[] {
  if (slot.taken) return picked;
  if (picked.includes(slot.at)) return picked.filter((at) => at !== slot.at);
  return [...picked, slot.at].sort();
}

// The picked hours split into contiguous runs: 10,11,1 becomes a 2-hour run and a 1-hour run.
export function runsOf(picked: string[], minutes: number): Run[] {
  const step = minutes * MINUTE_MS;
  const runs: Run[] = [];

  for (const at of [...picked].sort()) {
    const last = runs.at(-1);
    const follows =
      last !== undefined &&
      new Date(at).getTime() - new Date(last.startsAt).getTime() === last.slots * step;
    // A new run also starts once one hits the ceiling, so a single booking never asks for too many.
    if (follows && last.slots < APPOINTMENT_MAX_SLOTS) last.slots += 1;
    else runs.push({ startsAt: at, slots: 1 });
  }

  return runs;
}

// A single slot as the range it covers, e.g. "10:00–10:59".
export function slotRangeLabel(at: string, minutes: number): string {
  const ends = new Date(new Date(at).getTime() + minutes * MINUTE_MS - MINUTE_MS).toISOString();
  return `${clock24(at)}–${clock24(ends)}`;
}

// One run as its full span, e.g. "10:00–12:00 · 2 hours".
export function runLabel(run: Run, minutes: number): string {
  const ends = new Date(new Date(run.startsAt).getTime() + run.slots * minutes * MINUTE_MS);
  const hours = run.slots === 1 ? '1 hour' : `${run.slots} hours`;
  return `${clock24(run.startsAt)}–${clock24(ends.toISOString())} · ${hours}`;
}
