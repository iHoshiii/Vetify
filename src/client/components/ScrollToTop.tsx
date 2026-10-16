import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function anchorId(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash && hash !== '#home') {
        const el = document.getElementById(anchorId(hash));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
