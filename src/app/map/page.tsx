'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Leaflet must be loaded client-side only (no SSR)
const VetMap = dynamic(() => import('@/components/VetMap'), { ssr: false });

export default function MapPage() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6fbfb] text-slate-950 flex flex-col justify-center">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-8 gap-8 lg:gap-12 w-full">
        {/* LEFT — Text + Info */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-[1.1] text-slate-900 sm:text-5xl">
              Find a vet
              <br />
              <span className="text-blue-600">near you.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-500 max-w-md">
              Discover veterinary clinics and pet care services. Pins are sourced live from
              OpenStreetMap — click any marker for details.
            </p>
          </div>

          {/* Info cards */}
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 transition-transform duration-300 group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  Address
                </p>
                <p className="text-sm font-semibold text-slate-800">123 Vetify Lane, Bayombong</p>
                <p className="text-xs text-slate-500">Nueva Vizcaya 3700, Philippines</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 transition-transform duration-300 group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  Hours
                </p>
                <p className="text-sm font-semibold text-slate-800">Mon–Fri: 8:00 AM – 8:00 PM</p>
                <p className="text-xs text-slate-500">
                  Saturday: 9:00 AM – 5:00 PM · Sunday: Closed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 transition-transform duration-300 group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  Contact
                </p>
                <p className="text-sm font-semibold text-slate-800">(555) 123-4567</p>
                <p className="text-xs text-slate-500">clinic@vetify.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Interactive Vet Map */}
        <div className="hidden lg:block flex-shrink-0 w-[400px] xl:w-[480px]">
          <div
            style={{ aspectRatio: '1 / 1' }}
            className="relative w-full rounded-[2.5rem] overflow-hidden border border-blue-900/10 bg-white shadow-2xl shadow-blue-900/8 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.2)] hover:-translate-y-2 hover:border-blue-400/40"
          >
            {/* Decorative gradient frame */}
            <div className="absolute inset-0 z-10 rounded-[2.5rem] ring-1 ring-inset ring-white/20 pointer-events-none" />

            {/* Interactive map — pointer events disabled so click expands */}
            {/* isolation:isolate creates a stacking context that contains Leaflet's internal z-indices */}
            <div className="absolute inset-0" style={{ isolation: 'isolate' }}>
              <VetMap zoom={11} center={[16.32, 121.1]} showOverlay interactive={false} />
            </div>
          </div>

          {/* Caption below map */}
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-slate-400 font-medium">🐾 Vet clinics · Philippines</p>
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 transition-colors"
            >
              Open full map →
            </button>
          </div>
        </div>
      </section>

      {/* ── FULLSCREEN MAP MODAL ──────────────────────────────── */}
      {expanded && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md"
          style={{ animation: 'fadeIn 0.2s ease both' }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full h-full"
            style={{ animation: 'scaleIn 0.25s ease both' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-5 right-5 z-[2100] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-xl text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close
            </button>

            {/* Full interactive map */}
            <VetMap zoom={11} center={[16.32, 121.1]} showOverlay />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.97);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
