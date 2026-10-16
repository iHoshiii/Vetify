import { useEffect, useRef } from 'react';

export function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const update = () => {
      document.documentElement.style.setProperty(
        '--site-header-height',
        `${Math.ceil(header.getBoundingClientRect().height)}px`
      );
    };
    update();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(header);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--site-header-height');
    };
  }, []);
  return ref;
}
