import { useEffect, useRef, useState, type UIEvent } from 'react';

// Long enough that the conditions cannot be waved through on reflex
export const READ_SECONDS = 10;
// A scrolled-to-the-bottom list is rarely exact, so the last few pixels count as the end
const BOTTOM_SLACK = 24;

export function useTermsGate(open: boolean) {
  const [agreed, setAgreed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(READ_SECONDS);
  const [readToEnd, setReadToEnd] = useState(false);
  const list = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setAgreed(false);
    setSecondsLeft(READ_SECONDS);
    const el = list.current;
    // A list short enough to fit its box has no end left to scroll to
    setReadToEnd(!el || el.scrollHeight - el.clientHeight <= BOTTOM_SLACK);
  }, [open]);

  // The clock starts at the bottom of the list, so the wait cannot be spent scrolling
  useEffect(() => {
    if (!open || !readToEnd) return;
    const timer = setInterval(() => setSecondsLeft((left) => Math.max(0, left - 1)), 1000);
    return () => clearInterval(timer);
  }, [open, readToEnd]);

  function onListScroll(event: UIEvent<HTMLOListElement>): void {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK) setReadToEnd(true);
  }

  return {
    agreed,
    setAgreed,
    secondsLeft,
    readToEnd,
    counting: readToEnd && secondsLeft > 0,
    canAgree: readToEnd && secondsLeft === 0,
    list,
    onListScroll,
  };
}
