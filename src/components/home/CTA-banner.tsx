import ScrollReveal from '@/components/ScrollReveal';

export default function CtaBanner() {
  return (
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
              Vet Professional? Be part of Vetify!
            </p>
            <h2 className="mt-3 max-w-2xl text-xl font-semibold leading-8 tracking-tight text-white/90">
              Join a community of dedicated veterinary professionals providing trusted, accessible
              guidance to pet parents when they need it most.
            </h2>
          </div>
          <a
            href="/professionals"
            className="btn-glow inline-flex h-12 w-full shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white px-8 text-sm font-bold text-slate-950 shadow-lg transition-all hover:bg-teal-50 md:w-auto"
          >
            See more
          </a>
        </div>
      </section>
    </ScrollReveal>
  );
}
