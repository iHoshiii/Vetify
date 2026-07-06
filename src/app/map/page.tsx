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
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="min-h-screen flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-28 gap-12 lg:gap-20">
        {/* LEFT — Text + Info */}
        <div className="flex-1 flex flex-col gap-10">
          {/* Tag */}
          <div className="inline-flex w-fit items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Nueva Vizcaya, PH
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-5xl font-black tracking-tight leading-[1.1] text-slate-900 sm:text-6xl">
              Find a vet
              <br />
              <span className="text-blue-600">near you.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500 max-w-md">
              Discover veterinary clinics and pet care services across Nueva Vizcaya. Pins are
              sourced live from OpenStreetMap — click any marker for details.
            </p>
          </div>

          {/* Info cards */}
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1">
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 transition-transform duration-300 group-hover:scale-110">
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
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Address
                </p>
                <p className="text-sm font-semibold text-slate-800">123 Vetify Lane, Bayombong</p>
                <p className="text-sm text-slate-500">Nueva Vizcaya 3700, Philippines</p>
              </div>
            </div>

            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 transition-transform duration-300 group-hover:scale-110">
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
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Hours
                </p>
                <p className="text-sm font-semibold text-slate-800">Mon–Fri: 8:00 AM – 8:00 PM</p>
                <p className="text-sm text-slate-500">
                  Saturday: 9:00 AM – 5:00 PM · Sunday: Closed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 transition-transform duration-300 group-hover:scale-110">
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
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Contact
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  (555) 123-4567 · Emergency: (555) 911-VETS
                </p>
                <p className="text-sm text-slate-500">clinic@vetify.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Interactive Vet Map */}
        <div className="hidden lg:block flex-shrink-0 w-[480px] xl:w-[560px]">
          <div
            onClick={() => setExpanded(true)}
            style={{ aspectRatio: '1 / 1' }}
            className="relative w-full cursor-pointer rounded-[2.5rem] overflow-hidden border border-blue-900/10 bg-white shadow-2xl shadow-blue-900/8 group transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.2)] hover:-translate-y-2 hover:border-blue-400/40"
          >
            {/* Expand hint overlay */}
            <div className="absolute inset-0 z-20 flex flex-col items-end justify-end p-5 pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-white/80 shadow-lg backdrop-blur-sm text-slate-700 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <svg
                  className="w-3.5 h-3.5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
                Expand map
              </div>
            </div>

            {/* Decorative gradient frame */}
            <div className="absolute inset-0 z-10 rounded-[2.5rem] ring-1 ring-inset ring-white/20 pointer-events-none" />

            {/* Interactive map — pointer events disabled so click expands */}
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              <VetMap zoom={11} center={[16.32, 121.1]} showOverlay />
            </div>
          </div>

          {/* Caption below map */}
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-slate-400 font-medium">
              🐾 Vet clinics · Nueva Vizcaya, Philippines
            </p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md"
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
              className="absolute top-5 right-5 z-[500] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-xl text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-150"
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
