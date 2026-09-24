import { completeConfirmed, findStartedConfirmed } from '../models';

// How often the scanner wakes.
const SCAN_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

// One pass: any confirmed booking whose end (startsAt + minutes) has passed becomes completed.
export async function scanCompletions(): Promise<void> {
  const now = new Date();
  const started = await findStartedConfirmed(now);

  for (const appointment of started) {
    // End is not stored, so recheck it here; startsAt <= now only means it began.
    const endMs = appointment.startsAt.getTime() + appointment.minutes * 60_000;
    if (endMs > now.getTime()) continue;

    await completeConfirmed(appointment._id);
  }
}

// Starts the background sweep once. Unref'd so a pending tick never holds the process open at shutdown.
export function startCompletionScanner(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scanCompletions().catch((err) => console.error('[completions] scan failed', err));
  }, SCAN_INTERVAL_MS);
  timer.unref();
}

export function stopCompletionScanner(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
