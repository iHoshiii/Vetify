import FloatingBones from '@/components/FloatingBones';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative flex min-h-[780px] flex-col overflow-hidden bg-cover bg-[center_bottom] md:min-h-[860px] md:bg-center"
      style={{ backgroundImage: "url('/home-bg.jpg')" }}
    >
      <FloatingBones />

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

          <h1 className="hero-title mt-6 text-4xl font-black leading-[1] tracking-tight text-vet-ink sm:text-5xl lg:text-6xl">
            Health guidance
            <br className="hidden sm:block" />
            for pets you love.
          </h1>

          <p className="hero-sub mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Vetify brings symptom triage, meal planning, anatomy education, and nearby veterinary
            search into one simple place for busy pet owners.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/chat"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-vet-primary px-8 text-sm font-bold text-white transition-colors hover:bg-vet-primary-dark"
            >
              Ask AI
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-8 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-900/30"
            >
              How it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
