'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { label: 'Home', href: '/#home' },
  { label: 'About Us', href: '/#about' },
  { label: 'Services', href: '/services' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Contact Us', href: '/contact' },
];

const toolsItems = [
  { label: '📍 Find Vets', href: '/map', desc: 'Locate nearby clinics' },
  { label: '🥗 Meal Planner', href: '/planner', desc: 'Custom pet meal plans' },
  { label: '🦴 Anatomy', href: '/anatomy', desc: 'Explore pet anatomy' },
  { label: '❓ FAQs', href: '/help', desc: 'Common questions answered' },
];

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const showAuthActions = status === 'unauthenticated';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close Tools dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md'
          : 'border-b border-slate-200 bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Logo */}
        <a href="/" className="group flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-md shadow-teal-500/30 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
            V
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">Vetify</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-teal-700"
            >
              {item.label}
              <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-teal-600 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}

          {/* Tools dropdown */}
          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen((v) => !v)}
              className="group relative flex items-center gap-1 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-teal-700"
            >
              Tools
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  toolsOpen ? 'rotate-180' : ''
                }`}
              >
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-teal-600 transition-transform duration-300 group-hover:scale-x-100" />
            </button>

            {/* Dropdown panel */}
            <div
              className={`absolute left-0 top-full mt-2 w-52 origin-top-left rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-900/10 transition-all duration-200 ${
                toolsOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
              }`}
            >
              {toolsItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setToolsOpen(false)}
                  className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-teal-50"
                >
                  <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  <span className="mt-0.5 text-xs text-slate-500">{item.desc}</span>
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/book-appointment"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/30"
          >
            Book Appointment
          </a>
          {showAuthActions ? (
            <>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <a
                  href="/login"
                  className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-teal-700"
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                >
                  Sign up
                </a>
              </div>
            </>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:text-teal-700 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          menuOpen ? 'max-h-[600px] border-t border-slate-200' : 'max-h-0'
        }`}
      >
        <nav className="flex flex-col gap-1 bg-white px-5 pb-4 pt-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
            >
              {item.label}
            </a>
          ))}

          {/* Tools group in mobile */}
          <div className="my-1 h-px bg-slate-100" />
          <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Tools
          </p>
          {toolsItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
            >
              {item.label}
            </a>
          ))}

          <div className="my-2 h-px bg-slate-100" />
          <a
            href="/book-appointment"
            className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md"
            onClick={() => setMenuOpen(false)}
          >
            Book Appointment
          </a>
          {showAuthActions ? (
            <div className="mt-1 flex gap-2">
              <a
                href="/login"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-teal-300"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </a>
              <a
                href="/signup"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-teal-300"
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </a>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
