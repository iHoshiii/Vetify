import { useEffect, useState } from 'react';

import { isCallActive } from './call-visited';

const JOIN_LEAD_MS = 15 * 60_000;

// 'open' spans the joinable window: the 15 minutes before the start through the session's end. 'before' is too early, 'after' is past the end.
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

// True while some tab of this browser is in the call, read live off the heartbeat so a second tab shows 'Ongoing' instead of letting the person join twice.
export function useCallActive(appointmentId: string): boolean {
  const [active, setActive] = useState(() => isCallActive(appointmentId));

  useEffect(() => {
    const check = () => setActive(isCallActive(appointmentId));
    check();
    const id = setInterval(check, 3_000);
    window.addEventListener('storage', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', check);
    };
  }, [appointmentId]);

  return active;
}
