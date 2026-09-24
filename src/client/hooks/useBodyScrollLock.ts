import { useEffect } from 'react';

// Ref-counted so stacked overlays each hold a lock and the last one out restores the page.
let locks = 0;
let previousOverflow = '';

export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
