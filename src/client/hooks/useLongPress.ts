import { useCallback, useRef } from 'react';

// Fires after the finger has been held down a beat, the mobile stand-in for a desktop hover menu.
const HOLD_MS = 450;

// Touch handlers that call onLongPress once the press outlasts HOLD_MS. A move or early lift cancels it.
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const onTouchStart = useCallback(() => {
    clear();
    timer.current = setTimeout(onLongPress, HOLD_MS);
  }, [clear, onLongPress]);

  return { onTouchStart, onTouchEnd: clear, onTouchMove: clear };
}
