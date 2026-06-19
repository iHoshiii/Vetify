export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-xl font-semibold text-blue-700">Vetify</div>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#about" className="hover:text-slate-900">
              About
            </a>
            <a
              href="/chat"
              className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              Open App
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
              Pet health, redesigned
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              The easiest way to care for your pet with personalized guidance.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Vetify combines nutrition planning, symptom triage, and nearby veterinary search into
              one responsive experience built for confident pet owners.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/chat"
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                Get started
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explore features
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-br from-blue-100 via-sky-100 to-white p-8 shadow-[0_40px_120px_-40px_rgba(59,130,246,0.35)]">
            <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-8 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
                Care dashboard
              </p>
              <h2 className="mt-4 text-2xl font-bold text-slate-950">
                Everything your pet needs in one place
              </h2>
              <p className="mt-4 text-slate-600">
                Track wellness, get AI-backed advice, and connect with local vets using a calm,
                modern interface.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">Nutrition</p>
                  <p className="mt-2 text-sm text-slate-600">Smart meal plans for every pet.</p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">Health</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Symptom triage and wellness insights.
                  </p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">Locator</p>
                  <p className="mt-2 text-sm text-slate-600">Find vets and clinics nearby.</p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">History</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Keep your pet’s care record organized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
              Features
            </p>
            <h2 className="text-3xl font-bold text-slate-950">Built for reliable pet care</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              Trusted tools for pet owners who want smarter nutrition guidance, faster vet
              discovery, and easier everyday care.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'AI-powered nutrition',
                description: 'Get meal guidance tailored to breed, age, and health.',
              },
              {
                title: 'Symptom triage',
                description: 'Understand common issues quickly with confidence.',
              },
              {
                title: 'Vet locator',
                description: 'Find nearby clinics and trusted care providers fast.',
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
          © {new Date().getFullYear()} Vetify — Designed for pet wellbeing.
        </div>
      </footer>
    </div>
  );
}
