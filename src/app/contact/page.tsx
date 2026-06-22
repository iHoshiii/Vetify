'use client';

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
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Get in touch
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            We&apos;re here to help.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Whether you need help navigating the platform, have a question about our professional
            partnerships, or just want to share feedback, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* ── DETAILED CONTACT SECTION ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Side: Contact Information */}
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 mb-8">
              Reach out directly
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">General Support</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">
                  Having trouble with your account or a specific feature? Our support team is ready
                  to assist you during business hours.
                </p>
                <a
                  href="mailto:support@vetify.com"
                  className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
                >
                  support@vetify.com
                </a>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Professional Partnerships</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">
                  Are you a licensed veterinarian looking to join the platform? Let&apos;s talk
                  about how we can work together.
                </p>
                <a
                  href="mailto:partners@vetify.com"
                  className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
                >
                  partners@vetify.com
                </a>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Media & Press</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">
                  For press inquiries, brand assets, or media interview requests, please reach out
                  to our communications team.
                </p>
                <a
                  href="mailto:press@vetify.com"
                  className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
                >
                  press@vetify.com
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Quick Contact Form */}
          <div className="rounded-3xl border border-teal-900/10 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/40">
            <h2 className="text-2xl font-bold text-slate-950 mb-6">Send us a message</h2>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
                <textarea
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button className="w-full rounded-xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5 mt-2">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── SOCIAL LINKS ─────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28 border-t border-slate-100">
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col items-center gap-4 rounded-2xl border border-teal-900/10 bg-[#f6fbfb] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${s.hoverBorder}`}
              >
                {/* Icon bubble */}
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${s.bg} text-white shadow-lg ${s.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  {s.icon}
                </div>

                {/* Text */}
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    {s.name}
                  </p>
                  <p className="mt-1 font-black text-slate-950">{s.handle}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
