import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { anatomyOrigin } from './anatomy-integration';

export function useAnatomyHost() {
  const location = useLocation();
  const hosted = useRef(
    window.parent !== window &&
      location.pathname === '/anatomy' &&
      new URLSearchParams(location.search).get('hosted') === '1'
  );
  const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
  useEffect(() => {
    if (!hosted.current || !origin) return;
    if (location.pathname !== '/anatomy') {
      window.parent.postMessage(
        {
          type: 'vetify-anatomy:navigate',
          path: location.pathname + location.search + location.hash,
        },
        origin
      );
    }
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (
        !anchor ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download')
      )
        return;
      const destination = new URL(anchor.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      window.parent.postMessage(
        {
          type: 'vetify-anatomy:navigate',
          path: destination.pathname + destination.search + destination.hash,
        },
        origin!
      );
    }
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [origin, location.pathname, location.search, location.hash]);
}
