import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REVEAL_SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale';

/**
 * Adds `.is-visible` to any `.reveal*` element that scrolls into view. Mount
 * once in the app shell.
 *
 * The reveal classes start at `opacity: 0`, so anything never observed stays
 * invisible. Two things guard against that under client-side routing:
 * re-running per navigation, and a MutationObserver that picks up elements
 * mounted later than the first pass (lazy routes, fetched lists).
 */
export default function RevealObserver() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const observe = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };

    observe(document);

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as HTMLElement;
          if (el.matches(REVEAL_SELECTOR) && !seen.has(el)) {
            seen.add(el);
            io.observe(el);
          }
          observe(el);
        }
      }
    });

    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
