'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Map', href: '/map' },
  { label: 'Services', href: '/services' },
];

export default function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 sm:px-8">
        <a href="/" className="shrink-0 text-xl font-black tracking-tight text-slate-950">
          Vetify
        </a>
        <nav className="flex flex-1 items-center justify-end gap-3 text-sm font-semibold text-slate-700 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-5 mr-2">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-slate-950" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-slate-900">Hi, {session.user?.name?.split(' ')[0]}</span>
                <button onClick={() => signOut()} className="transition hover:text-slate-950">
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <a href="/login" className="transition hover:text-slate-950">
                  Log in
                </a>
                <a
                  href="/signup"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-slate-950 shadow-sm transition hover:bg-slate-50 sm:px-4"
                >
                  Sign up
                </a>
              </>
            )}
            <a
              href="/book-appointment"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 text-center text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
            >
              Book Appointment
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
