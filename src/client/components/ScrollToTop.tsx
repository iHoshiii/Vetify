import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The browser restores scroll on history navigation, but a client-side route
 * change keeps the previous offset — so a link clicked halfway down one page
 * lands halfway down the next. Hash links keep their native anchor behaviour.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
