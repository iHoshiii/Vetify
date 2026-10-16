import { useEffect } from 'react';

export function useViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      const height = viewport && viewport.scale === 1 ? viewport.height : window.innerHeight;
      root.style.setProperty('--viewport-height', `${Math.round(height)}px`);
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      root.style.removeProperty('--viewport-height');
    };
  }, []);
}
