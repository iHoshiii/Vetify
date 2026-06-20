const features = [
  {
    title: 'AI Vet Assistant',
    description:
      'Ask about symptoms and get calm, practical guidance. When things are complex, we immediately direct you to a pro.',
    icon: (
      <svg
        className="w-10 h-10 text-teal-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    title: 'Personalized Meal Plans',
    description:
      "Build nutrition ideas tailored to your pet's age, weight, breed, and allergies. No more generic advice.",
    icon: (
      <svg
        className="w-10 h-10 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    icon: (
      <svg
        className="w-10 h-10 text-orange-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed veterinarians through our platform for one-on-one consultations.',
    icon: (
      <svg
        className="w-10 h-10 text-pink-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

const moreFeatures = [
  {
    title: 'Interactive Anatomy',
    description:
      'Explore the anatomy of dogs, cats, and birds. Click on different parts to learn about their health and function.',
    icon: (
      <svg
        className="w-12 h-12 text-indigo-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    href: '/chat?anatomy=true',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read articles from veterinary professionals about pet health, behavior, and local clinic spotlights.',
    icon: (
      <svg
        className="w-12 h-12 text-amber-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
      </svg>
    ),
    href: '/blogs',
  },
  {
    title: 'Pet Meal Plan',
    description:
      "Get custom weekly meal plans designed specifically for your pet's unique dietary needs and preferences.",
    icon: (
      <svg
        className="w-12 h-12 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    href: '/planner',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* Hero Section */}
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
              Vetify brings symptom triage, meal planning, anatomy education, and nearby veterinary
              search into one simple place for busy pet owners.
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

      {/* Core Features */}
      <section id="features" className="border-y border-teal-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-teal-900/10 px-0 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="bg-white px-6 py-10 sm:px-8">
              <div className="mb-4">{feature.icon}</div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">{feature.title}</h2>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* More Features (Anatomy, Blogs, Hire Pro) */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
              More for your pet
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Everything you need in one app
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {moreFeatures.map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                className="group bg-[#f6fbfb] p-8 rounded-2xl border border-teal-900/10 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 group-hover:scale-110 transition">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center text-teal-700 font-semibold text-sm">
                  Explore
                  <svg
                    className="w-4 h-4 ml-1 group-hover:translate-x-1 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
