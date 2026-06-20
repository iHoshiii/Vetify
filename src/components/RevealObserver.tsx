'use client';

import { useEffect } from 'react';

/**
 * Attaches a single IntersectionObserver to the document that
 * adds `.is-visible` to any element with a `.reveal*` class
 * when it enters the viewport. Place this once in the root layout.
 */
export default function RevealObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const attach = () => {
      document
        .querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right, .reveal-scale')
        .forEach((el) => observer.observe(el));
    };

    // Attach immediately and re-attach after potential hydration mutations
    attach();
    const timer = setTimeout(attach, 300);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
