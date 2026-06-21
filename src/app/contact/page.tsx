const socials = [
  {
    name: 'TikTok',
    handle: '@vetify',
    href: 'https://tiktok.com/@vetify',
    bg: 'from-slate-800 to-slate-950',
    shadow: 'shadow-slate-900/30',
    hoverBorder: 'hover:border-slate-600/50',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.26 8.26 0 0 0 4.84 1.56V6.79a4.85 4.85 0 0 1-1.07-.1z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    handle: '@vetify',
    href: 'https://facebook.com/vetify',
    bg: 'from-blue-600 to-blue-800',
    shadow: 'shadow-blue-600/30',
    hoverBorder: 'hover:border-blue-500/50',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    handle: '@vetify',
    href: 'https://instagram.com/vetify',
    bg: 'from-pink-500 via-rose-500 to-orange-400',
    shadow: 'shadow-pink-500/30',
    hoverBorder: 'hover:border-pink-400/50',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    handle: 'Vetify',
    href: 'https://linkedin.com/company/vetify',
    bg: 'from-sky-600 to-sky-800',
    shadow: 'shadow-sky-600/30',
    hoverBorder: 'hover:border-sky-500/50',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: 'Email',
    handle: 'hello@vetify.com',
    href: 'mailto:hello@vetify.com',
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
    hoverBorder: 'hover:border-teal-400/50',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-6 w-6"
      >
        <path
          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Website',
    handle: 'vetify.com',
    href: 'https://vetify.com',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
    hoverBorder: 'hover:border-indigo-400/50',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-6 w-6"
      >
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
        <path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 px-5 py-20 sm:px-8 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-teal-400">
            Get in touch
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Have a question, partnership inquiry, or just want to say hello? Find us on any of our
            channels below.
          </p>
        </div>
      </section>

      {/* ── SOCIAL LINKS ─────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              Find us online
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              We&apos;re everywhere you are
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Follow, message, or connect with Vetify across all our platforms.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-4 rounded-2xl border border-teal-900/10 bg-[#f6fbfb] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${s.hoverBorder}`}
              >
                {/* Icon bubble */}
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg} text-white shadow-lg ${s.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  {s.icon}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    {s.name}
                  </p>
                  <p className="mt-0.5 truncate text-lg font-black text-slate-950">{s.handle}</p>
                </div>

                {/* Arrow */}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-teal-500"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM NOTE ──────────────────────────────────────── */}
      <section className="bg-[#f6fbfb] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-slate-500">
            For professional partnership or media inquiries, reach us directly at{' '}
            <a
              href="mailto:hello@vetify.com"
              className="font-semibold text-teal-700 underline-offset-2 hover:underline"
            >
              hello@vetify.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
