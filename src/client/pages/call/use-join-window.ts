import { useEffect, useState } from 'react';

const JOIN_LEAD_MS = 15 * 60_000;

export type JoinPhase = 'before' | 'open' | 'after';

// The client mirror of the server's call:join window, re-checked on a slow tick so the gate flips live.
export function useJoinWindow(startsAt: string, minutes: number): JoinPhase {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(startsAt).getTime();
  if (now < start - JOIN_LEAD_MS) return 'before';
  if (now > start + minutes * 60_000) return 'after';
  return 'open';
}
