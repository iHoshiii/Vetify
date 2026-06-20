const features = [
  {
    title: 'Ask about symptoms',
    description: 'Get calm, practical guidance when something feels off.',
  },
  {
    title: 'Plan better meals',
    description: 'Build nutrition ideas around your pet, not generic advice.',
  },
  {
    title: 'Find care nearby',
    description: 'Move quickly from concern to a local clinic when needed.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <section
        className="relative flex min-h-[760px] flex-col overflow-hidden bg-cover bg-[center_bottom] md:min-h-[820px] md:bg-center"
        style={{ backgroundImage: "url('/home-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,253,253,0.92)_0%,rgba(196,239,240,0.72)_38%,rgba(246,251,251,0.08)_72%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-5 pb-12 pt-12 sm:px-8 lg:pt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
              Everyday pet care
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Health guidance for pets you love.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              Vetify brings symptom triage, meal planning, and nearby veterinary search into one
              simple place for busy pet owners.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/chat"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start a care chat
              </a>
              <a
                href="/planner"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-900/15 bg-white/75 px-6 text-sm font-bold text-slate-950 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                Plan meals
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-teal-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-teal-900/10 px-0 sm:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="bg-white px-6 py-8 sm:px-8">
              <h2 className="text-lg font-black tracking-tight text-slate-950">{feature.title}</h2>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f6fbfb] px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
              Built for real decisions
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Move from “is this normal?” to a clear next step.
            </h2>
          </div>
          <a
            href="/map"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900/30 md:w-auto"
          >
            Find nearby vets
          </a>
        </div>
      </section>
    </main>
  );
}
