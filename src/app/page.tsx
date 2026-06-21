import FloatingBones from '@/components/FloatingBones';
import ScrollReveal from '@/components/ScrollReveal';

/* ─── Data ──────────────────────────────────────────────────── */
const features = [
  {
    title: 'AI Vet Assistant',
    description:
      'Ask about symptoms and get calm, practical guidance. When things are complex, we immediately direct you to a pro.',
    emoji: 'AI',
    isText: true,
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
  },
  {
    title: 'Personalized Meal Plans',
    description:
      "Build nutrition ideas tailored to your pet's age, weight, breed, and allergies. No more generic advice.",
    emoji: '🍽️',
    isText: false,
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    emoji: '📍',
    isText: false,
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed veterinarians through our platform for one-on-one consultations.',
    emoji: '👩‍⚕️',
    isText: false,
    bg: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
  },
];

const moreFeatures = [
  {
    title: 'Interactive Anatomy',
    description:
      'Explore the anatomy of dogs, cats, and birds. Click on different parts to learn about their health and function.',
    icon: '🦴',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
    hover: 'group-hover:text-indigo-600',
    href: '/chat?anatomy=true',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read articles from veterinary professionals about pet health, behavior, and local clinic spotlights.',
    icon: '📝',
    bg: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/30',
    hover: 'group-hover:text-amber-600',
    href: '/blogs',
  },
  {
    title: 'Pet Meal Plan',
    description:
      "Get custom weekly meal plans designed specifically for your pet's unique dietary needs and preferences.",
    icon: '🥗',
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
    hover: 'group-hover:text-blue-600',
    href: '/planner',
  },
];

const steps = [
  {
    num: '01',
    title: 'Describe your concern',
    body: "Tell our AI about your pet's symptoms, diet, or question. No forms, just a conversation.",
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
  },
  {
    num: '02',
    title: 'Get instant guidance',
    body: "Receive calm, evidence-based advice tailored to your pet's breed, age, and condition.",
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
  },
  {
    num: '03',
    title: 'Connect with a vet',
    body: 'If your pet needs professional care, find and book verified local vets in seconds.',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
  },
];

/* ───Page component────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-[780px] flex-col overflow-hidden bg-cover bg-[center_bottom] md:min-h-[860px] md:bg-center"
        style={{ backgroundImage: "url('/home-bg.jpg')" }}
      >
        {/* Particle layer */}
        <FloatingBones />

        {/* Animated colour blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="blob-1 absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-teal-300/20 blur-[80px]" />
          <div className="blob-2 absolute -right-20 bottom-0 h-[440px] w-[440px] rounded-full bg-blue-300/20 blur-[80px]" />
          <div className="blob-3 absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-emerald-200/15 blur-[60px]" />
        </div>

        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 55% at 50% 22%, rgba(246,251,251,0.98) 0%, rgba(246,251,251,0.88) 28%, rgba(246,251,251,0.45) 52%, rgba(246,251,251,0) 68%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 justify-center px-5 pb-16 pt-10 sm:px-8">
          <div className="flex max-w-3xl flex-col items-center text-center">
            {/* Eyebrow */}
            <span className="hero-tag inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-teal-700 shadow-sm">
              Everyday pet care
            </span>

            {/* Headline with animated gradient */}
            <h1 className="hero-title gradient-text mt-6 text-5xl font-black leading-[0.97] tracking-tight sm:text-6xl lg:text-7xl">
              Health guidance
              <br className="hidden sm:block" />
              for pets you love.
            </h1>

            {/* Sub-copy */}
            <p className="hero-sub mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Vetify brings symptom triage, meal planning, anatomy education, and nearby veterinary
              search into one simple place for busy pet owners.
            </p>

            {/* CTAs */}
            <div className="hero-cta mt-10 flex flex-wrap justify-center gap-3">
              <a
                href="/chat"
                className="btn-glow inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-7 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
              >
                Start a care chat
              </a>
              <a
                href="/planner"
                className="btn-glow inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-7 text-sm font-bold text-white shadow-lg shadow-teal-600/30 transition-all hover:bg-teal-700"
              >
                Plan meals
              </a>
              <a
                href="/map"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white/80 px-7 text-sm font-bold text-slate-900 backdrop-blur-sm shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
              >
                Nearest Vets
              </a>
            </div>

            {/* Scroll nudge */}
            <div className="hero-scroll-badge mt-14 flex flex-col items-center gap-1.5 text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-widest">
                Scroll to explore
              </span>
              <div className="scroll-indicator h-5 w-5">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 4v12M4 10l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURE GRID ══════════════════════════════════════ */}
      <section id="features" className="border-b border-teal-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-teal-900/10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} variant="reveal" delay={i * 90} className="bg-white">
              <article className="card-shine group h-full bg-white px-7 py-10 transition-all duration-300 hover:bg-teal-50/50 sm:px-8">
                {/* Icon */}
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${
                    f.bg
                  } shadow-md ${
                    f.shadow
                  } transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                    f.isText ? 'text-sm font-bold text-white' : 'text-xl'
                  }`}
                >
                  {f.emoji}
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">{f.title}</h2>
                <p className="mt-3 max-w-sm leading-7 text-slate-600">{f.description}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══ ABOUT US ══════════════════════════════════════════ */}
      <section className="bg-[#f6fbfb] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* Left — text */}
            <ScrollReveal variant="reveal-left">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
                About us
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Built by pet lovers,
                <br className="hidden sm:block" /> for pet lovers.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                Vetify was born out of a simple frustration — pet owners deserve fast, reliable
                guidance without having to scroll through forums or wait days for an appointment. We
                built a platform that puts the right tools in your hands, right when you need them.
              </p>
              <p className="mt-4 max-w-lg leading-8 text-slate-500">
                Our team combines veterinary knowledge, AI research, and software engineering to
                make pet care less stressful and more informed — for every breed, every budget, and
                every stage of your pet&apos;s life.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/about"
                  className="btn-glow inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
                >
                  Our full story
                </a>
                <a
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
                >
                  Contact us
                </a>
              </div>
            </ScrollReveal>

            {/* Right — stat cards */}
            <ScrollReveal variant="reveal-right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    value: '0',
                    label: 'Pet owners helped',
                    bg: 'from-teal-500 to-teal-700',
                    shadow: 'shadow-teal-500/20',
                  },
                  {
                    value: '0',
                    label: 'Satisfaction rate',
                    bg: 'from-blue-500 to-blue-700',
                    shadow: 'shadow-blue-500/20',
                  },
                  {
                    value: '0',
                    label: 'Species supported',
                    bg: 'from-indigo-500 to-indigo-700',
                    shadow: 'shadow-indigo-500/20',
                  },
                  {
                    value: '0',
                    label: 'AI always on',
                    bg: 'from-emerald-500 to-emerald-700',
                    shadow: 'shadow-emerald-500/20',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`card-shine rounded-2xl bg-gradient-to-br ${stat.bg} p-7 shadow-lg ${stat.shadow}`}
                  >
                    <p className="stat-num text-4xl font-black text-white">{stat.value}</p>
                    <p className="mt-1 text-sm font-semibold text-white/80">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <ScrollReveal variant="reveal" className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              Simple process
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              How Vetify works
            </h2>
          </ScrollReveal>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              aria-hidden
              className="absolute left-1/2 top-8 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-teal-200 via-blue-200 to-teal-200 md:block"
            />
            {steps.map((s, i) => (
              <ScrollReveal key={s.num} variant="reveal" delay={i * 130}>
                <div className="card-shine group relative rounded-2xl border border-teal-900/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div
                    className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg} text-lg font-black text-white shadow-md ${s.shadow} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {s.num}
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{s.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{s.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MORE FEATURES ═════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#f6fbfb] py-20 sm:py-28">
        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #0d9488 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <ScrollReveal variant="reveal" className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              More for your pet
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Everything you need in one app
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              All the tools a pet owner could need, thoughtfully brought together.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-3">
            {moreFeatures.map((f, i) => (
              <ScrollReveal key={f.title} variant="reveal-scale" delay={i * 110}>
                <a
                  href={f.href}
                  className="card-shine group flex h-full flex-col rounded-2xl border border-teal-900/10 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-teal-500/30 hover:shadow-xl"
                >
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${f.bg} text-2xl shadow-md ${f.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    {f.icon}
                  </div>
                  <h3
                    className={`text-xl font-bold text-slate-950 transition-colors duration-200 ${f.hover}`}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-slate-600">{f.description}</p>
                  <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-teal-700 transition-all duration-300 group-hover:gap-2">
                    Explore
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT US ══════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* Left — text */}
            <ScrollReveal variant="reveal-left">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
                About us
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Built by pet lovers,
                <br className="hidden sm:block" /> for pet lovers.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                Vetify was born out of a simple frustration — pet owners deserve fast, reliable
                guidance without having to scroll through forums or wait days for an appointment. We
                built a platform that puts the right tools in your hands, right when you need them.
              </p>
              <p className="mt-4 max-w-lg leading-8 text-slate-500">
                Our team combines veterinary knowledge, AI research, and software engineering to
                make pet care less stressful and more informed — for every breed, every budget, and
                every stage of your pet&apos;s life.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/about"
                  className="btn-glow inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
                >
                  Our full story
                </a>
                <a
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
                >
                  Contact us
                </a>
              </div>
            </ScrollReveal>

            {/* Right — stat cards */}
            <ScrollReveal variant="reveal-right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    value: '10k+',
                    label: 'Pet owners helped',
                    bg: 'from-teal-500 to-teal-700',
                    shadow: 'shadow-teal-500/20',
                  },
                  {
                    value: '95%',
                    label: 'Satisfaction rate',
                    bg: 'from-blue-500 to-blue-700',
                    shadow: 'shadow-blue-500/20',
                  },
                  {
                    value: '3',
                    label: 'Species supported',
                    bg: 'from-indigo-500 to-indigo-700',
                    shadow: 'shadow-indigo-500/20',
                  },
                  {
                    value: '24/7',
                    label: 'AI always on',
                    bg: 'from-emerald-500 to-emerald-700',
                    shadow: 'shadow-emerald-500/20',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`card-shine rounded-2xl bg-gradient-to-br ${stat.bg} p-7 shadow-lg ${stat.shadow}`}
                  >
                    <p className="stat-num text-4xl font-black text-white">{stat.value}</p>
                    <p className="mt-1 text-sm font-semibold text-white/80">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ════════════════════════════════════════ */}
      <ScrollReveal variant="reveal">
        <section className="relative overflow-hidden bg-slate-950 px-5 py-16 sm:px-8 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-teal-500/20 blur-[80px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-500/20 blur-[80px]"
          />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-400">
                Built for real decisions
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Move from &ldquo;is this normal?&rdquo; to a clear next step.
              </h2>
            </div>
            <a
              href="/map"
              className="btn-glow inline-flex h-12 w-full shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white px-8 text-sm font-bold text-slate-950 shadow-lg transition-all hover:bg-teal-50 md:w-auto"
            >
              Find nearby vets
            </a>
          </div>
        </section>
      </ScrollReveal>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-md shadow-teal-500/30">
                  V
                </div>
                <span className="text-xl font-black">Vetify</span>
              </div>
              <p className="mt-4 leading-relaxed text-slate-400">
                Your trusted pet health companion, bringing AI-powered guidance, expert
                veterinarians, and essential pet care tools all in one place.
              </p>
              <div className="mt-6 flex gap-3">
                {['T', 'I', 'F'].map((letter) => (
                  <a
                    key={letter}
                    href="#"
                    className="badge-spin flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-400 transition hover:bg-teal-700 hover:text-white"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-6 text-lg font-bold text-white">Quick Links</h3>
              <ul className="space-y-4">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Services', href: '/services' },
                  { label: 'Find Vets', href: '/map' },
                  { label: 'Book Appointment', href: '/book-appointment' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-6 text-lg font-bold text-white">Resources</h3>
              <ul className="space-y-4">
                {[
                  { label: 'Blogs', href: '/blogs' },
                  { label: 'FAQs', href: '/faqs' },
                  { label: 'Anatomy Guide', href: '/chat?anatomy=true' },
                  { label: 'Meal Planner', href: '/planner' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-6 text-lg font-bold text-white">Legal</h3>
              <ul className="space-y-4">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Contact Us', href: '/contact' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-slate-400">
                &copy; {new Date().getFullYear()} Vetify. All rights reserved.
              </p>
              <span className="text-sm text-slate-400">Made with ❤️ for pets</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
