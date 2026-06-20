'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** 'reveal' | 'reveal-left' | 'reveal-right' | 'reveal-scale' */
  variant?: 'reveal' | 'reveal-left' | 'reveal-right' | 'reveal-scale';
  delay?: number; // ms
  threshold?: number; // 0-1
  once?: boolean;
}

/**
 * Wraps children in a div that animates into view on scroll.
 * Uses IntersectionObserver — no extra dependencies.
 */
export default function ScrollReveal({
  children,
  className = '',
  variant = 'reveal',
  delay = 0,
  threshold = 0.12,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) {
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          if (once) observer.disconnect();
        } else if (!once) {
          el.classList.remove('is-visible');
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold, once]);

  return (
    <div ref={ref} className={`${variant} ${className}`}>
      {children}
    </div>
  );
}
