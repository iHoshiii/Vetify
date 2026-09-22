import { emitTyping } from '@/lib/socket';
import { useCallback, useEffect, useRef } from 'react';

// Re-announce "still typing" at most this often, and auto-send "stopped" after this much quiet.
const REPEAT_MS = 2500;
const IDLE_MS = 3500;

// Turns raw keystroke booleans into a paced socket signal, so a fast typist does not flood the wire.
export function useTypingEmitter(threadId: string) {
  const lastSent = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    lastSent.current = 0;
    emitTyping(threadId, false);
  }, [threadId]);

  const onType = useCallback(
    (typing: boolean) => {
      if (!typing) return stop();
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(stop, IDLE_MS);
      const now = Date.now();
      if (now - lastSent.current < REPEAT_MS) return;
      lastSent.current = now;
      emitTyping(threadId, true);
    },
    [threadId, stop]
  );

  // A thread swap or unmount must not leave the other side seeing a stale "typing".
  useEffect(() => stop, [stop]);

  return onType;
}
