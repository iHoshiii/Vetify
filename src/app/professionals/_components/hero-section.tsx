export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-5 py-20 sm:px-8 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-teal-400">
          For veterinary professionals
        </span>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          Join Vetify as a
          <br className="hidden sm:block" /> Trusted Professional
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
          Partner with Vetify to connect with pet owners who need expert guidance — on your
          schedule, on your terms.
        </p>
        <a
          href="/contact"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-sm font-bold text-white shadow-lg shadow-teal-600/30 transition-all hover:bg-teal-700 hover:-translate-y-0.5"
        >
          Apply to join
        </a>
      </div>
    </section>
  );
}
