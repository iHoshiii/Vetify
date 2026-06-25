'use client';

export default function MapPage() {
  return (
    <main className="relative min-h-screen bg-[#f6fbfb] text-slate-950 overflow-hidden selection:bg-blue-500/30">
      {/* ── BACKGROUND ACCENTS ───────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] bg-gradient-to-b from-blue-100/50 via-transparent to-transparent opacity-70 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 text-center px-5 relative z-10">
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl text-slate-900 pb-4">
          Find us on the map
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-slate-600 font-medium">
          Experience world-class veterinary care at our flagship clinic. We are conveniently located
          in the heart of the city with premium facilities for you and your pets.
        </p>
      </section>

      {/* ── MAP & INFO SECTION ───────────────────────────────── */}
      <section className="w-full px-5 pb-32 max-w-7xl mx-auto relative z-10">
        {/* The Map */}
        <div className="relative w-full h-[65vh] min-h-[500px] rounded-[2.5rem] overflow-hidden border border-blue-900/10 bg-white shadow-2xl shadow-blue-900/5 group transform transition-all duration-700 hover:border-blue-500/30 hover:shadow-blue-900/10">
          <div className="absolute inset-0 bg-white z-0 flex flex-col items-center justify-center text-slate-500 transition-opacity duration-1000 group-hover:opacity-0">
            <svg
              className="w-12 h-12 mb-4 text-blue-600 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
            <span className="font-semibold tracking-widest uppercase text-sm text-blue-900">
              Loading Interactive Map
            </span>
          </div>

          <iframe
            src="https://maps.google.com/maps?q=Nueva+Vizcaya,+Philippines&t=&z=11&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 z-10 transition-opacity duration-500"
          ></iframe>
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
                Mon-Fri: 8:00 AM - 8:00 PM
                <br />
                Saturday: 9:00 AM - 5:00 PM
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
    </main>
  );
}
