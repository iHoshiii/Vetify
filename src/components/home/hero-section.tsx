import FloatingBones from '@/components/FloatingBones';

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative flex min-h-[780px] flex-col overflow-hidden bg-cover bg-[center_bottom] md:min-h-[860px] md:bg-center"
      style={{ backgroundImage: "url('/home-bg.jpg')" }}
    >
      <FloatingBones />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-1 absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-teal-300/20 blur-[80px]" />
        <div className="blob-2 absolute -right-20 bottom-0 h-[440px] w-[440px] rounded-full bg-blue-300/20 blur-[80px]" />
        <div className="blob-3 absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-emerald-200/15 blur-[60px]" />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 55% at 50% 22%, rgba(246,251,251,0.98) 0%, rgba(246,251,251,0.88) 28%, rgba(246,251,251,0.45) 52%, rgba(246,251,251,0) 68%)',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 justify-center px-5 pb-6 pt-10 sm:px-8">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <span className="hero-tag text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Everyday pet care
          </span>

          <h1 className="hero-title gradient-text mt-6 text-5xl font-black leading-[0.97] tracking-tight sm:text-6xl lg:text-7xl">
            Health guidance
            <br className="hidden sm:block" />
            for pets you love.
          </h1>

          <p className="hero-sub mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Vetify brings symptom triage, meal planning, anatomy education, and nearby veterinary
            search into one simple place for busy pet owners.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="/chat"
              className="btn-glow inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-8 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
            >
              Ask AI now →
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white/80 px-8 text-sm font-bold text-slate-700 backdrop-blur-sm shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
            >
              How it works ↓
            </a>
          </div>

          <div className="hero-scroll-badge mt-14 flex flex-col items-center gap-1.5 text-slate-400">
            <div className="scroll-indicator h-5 w-5">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 4v12M4 10l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
