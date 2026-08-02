export default function CtaSection() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Ready to make a difference?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
          Join a growing network of veterinary professionals helping pet owners make confident,
          informed decisions every day.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-8 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            Apply to join
          </a>
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-8 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
          >
            Back to home
          </a>
        </div>
      </div>
    </section>
  );
}
