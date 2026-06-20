'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Map', href: '/map' },
  { label: 'Services', href: '/services' },
];

export default function SiteHeader() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Switch header style once user scrolls 8px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60'
          : 'bg-white border-b border-slate-200'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Logo */}
        <a href="/" className="flex shrink-0 items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-md shadow-teal-500/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
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
              className="relative px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-teal-700 group"
            >
              {item.label}
              {/* Animated underline */}
              <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-teal-600 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/book-appointment"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/30"
          >
            Book Appointment
          </a>
          <div className="h-5 w-px bg-slate-200" />
          {session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-blue-100 font-bold text-teal-700 text-sm ring-2 ring-teal-200 transition-transform hover:scale-105">
                  {session.user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <span className="text-sm font-semibold text-slate-800">{session.user?.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-red-500"
              >
                Sign out
              </button>
            </div>
          ) : (
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
          )}
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
          menuOpen ? 'max-h-96 border-t border-slate-200' : 'max-h-0'
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
          <div className="my-2 h-px bg-slate-100" />
          <a
            href="/book-appointment"
            className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md"
            onClick={() => setMenuOpen(false)}
          >
            Book Appointment
          </a>
          {session ? (
            <button
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
              className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              Sign out
            </button>
          ) : (
            <div className="flex gap-2 mt-1">
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
          )}
        </nav>
      </div>
    </header>
  );
}
