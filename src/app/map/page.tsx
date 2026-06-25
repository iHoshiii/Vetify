'use client';

import { useState, useEffect } from 'react';

const MAP_SRC =
  'https://maps.google.com/maps?q=Nueva+Vizcaya,+Philippines&t=&z=11&ie=UTF8&iwloc=&output=embed';

export default function MapPage() {
  const [expanded, setExpanded] = useState(false);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when expanded
  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950 overflow-hidden">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 text-center px-5">
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl text-slate-900">
          Find us on the map
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500">
          Explore veterinary clinics and pet services in Nueva Vizcaya. Click the map to expand it.
        </p>
      </section>

      {/* ── MAP PREVIEW ──────────────────────────────────────── */}
      <section className="pb-24 px-5 max-w-7xl mx-auto">
        <div
          onClick={() => setExpanded(true)}
          className="relative cursor-pointer rounded-3xl overflow-hidden border border-blue-900/10 bg-white shadow-xl shadow-blue-900/5 group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 hover:border-blue-400/30"
          style={{ height: '340px' }}
        >
          {/* Overlay with click hint */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all duration-300 pointer-events-none">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 border border-white/60 shadow-lg backdrop-blur-md text-slate-800 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <svg
                className="w-4 h-4 text-blue-600"
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
              Click to expand
            </div>
          </div>

          <iframe
            src={MAP_SRC}
            width="100%"
            height="100%"
            style={{ border: 0, pointerEvents: 'none' }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 z-10"
          />
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="group relative rounded-3xl bg-white border border-blue-900/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <h3 className="text-xl font-bold text-slate-900 mb-3">Address</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                123 Vetify Lane
                <br />
                Bayombong, Nueva Vizcaya 3700
                <br />
                Philippines
              </p>
            </div>
          </div>

          <div className="group relative rounded-3xl bg-white border border-teal-900/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 border border-teal-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Hours</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Mon–Fri: 8:00 AM – 8:00 PM
                <br />
                Saturday: 9:00 AM – 5:00 PM
                <br />
                Sunday: Closed
              </p>
            </div>
          </div>

          <div className="group relative rounded-3xl bg-white border border-indigo-900/5 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 border border-indigo-100 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Contact</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Phone: (555) 123-4567
                <br />
                Emergency: (555) 911-VETS
                <br />
                Email: clinic@vetify.com
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FULLSCREEN MAP MODAL ──────────────────────────────── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full h-full max-w-[100vw] max-h-[100vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-white/60 shadow-lg backdrop-blur-md text-slate-800 text-sm font-semibold hover:bg-white transition-all duration-200"
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

            <iframe
              src={MAP_SRC}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease both;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease both;
        }
      `}</style>
    </main>
  );
}
