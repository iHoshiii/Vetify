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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="/" className="shrink-0 text-xl font-bold tracking-tight text-slate-900">
          Vetify
        </a>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-5">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-all duration-300 relative group"
                href={item.href}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </nav>
          <a
            href="/book-appointment"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
          >
            Book Appointment
          </a>
          <div className="h-6 w-px bg-slate-300"></div>
          {session ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-transform hover:scale-110">
                  <span className="text-slate-600 font-semibold text-sm">
                    {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{session.user?.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm font-semibold text-slate-900 hover:text-red-600 transition-colors duration-300"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <a
                href="/login"
                className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-300"
              >
                Log in
              </a>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5"
              >
                Sign up
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
