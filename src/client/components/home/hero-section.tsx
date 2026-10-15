import FloatingBones from '@/components/FloatingBones';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative flex min-w-0 flex-col overflow-hidden bg-[#eaf7f7] sm:min-h-[780px] md:min-h-[860px]"
    >
      <div
        className="absolute inset-0 hidden bg-cover bg-center sm:block"
        style={{ backgroundImage: "url('/home-bg.jpg')" }}
      />
      <div className="hidden sm:block">
        <FloatingBones />
      </div>

      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          background:
            'radial-gradient(ellipse 50% 55% at 50% 22%, rgba(246,251,251,0.98) 0%, rgba(246,251,251,0.88) 28%, rgba(246,251,251,0.45) 52%, rgba(246,251,251,0) 68%)',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-7xl flex-1 justify-center px-5 pb-8 pt-8 sm:px-8 sm:pt-10">
        <div className="flex min-w-0 max-w-3xl flex-col items-center text-center">
          <span className="hero-tag text-xs font-bold uppercase tracking-[0.18em] text-teal-700 sm:text-sm sm:tracking-[0.22em]">
            Everyday pet care
          </span>

          <h1 className="hero-title mt-4 text-[2rem] font-black leading-[1.1] tracking-tight text-vet-ink min-[390px]:text-4xl sm:mt-6 sm:text-5xl lg:text-6xl">
            Health guidance <br className="hidden sm:block" />
            for pets you love.
          </h1>

          <p className="hero-sub mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-xl sm:leading-8">
            Vetify brings veterinary guidance, nearby clinics and professional care together, with
            connected apps for everyday pet care.
          </p>

          <div className="hero-cta mt-6 grid w-full max-w-sm grid-cols-2 gap-3 sm:mt-10 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-center">
            <Link
              to="/chat"
              className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-xl bg-vet-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-vet-primary-dark sm:px-8"
            >
              Ask AI
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-900/30 sm:px-8"
            >
              How it works
            </a>
          </div>
        </div>
      </div>
      <img src="/home-bg.jpg" alt="" className="block h-auto w-full sm:hidden" />
    </section>
  );
}
