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
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 0 012-2h14a2 0 012 2v8a2 0 01-2 2h-5l-5 5v-5z"
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
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 0 11-4 0 2 2 0 014 0z"
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
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 0 11-4 0 2 2 0 014 0zM7 10a2 0 11-4 0 2 0 0 014 0z"
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
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 0 11-4 0 2 0 014 0z"
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
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 25%, rgba(246,251,251,0.98) 0%, rgba(246,251,251,0.85) 30%, rgba(246,251,251,0.4) 50%, rgba(246,251,251,0) 65%)',
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 justify-center px-5 pb-12 pt-8 sm:px-8">
          <div className="max-w-3xl text-center ">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
              Everyday pet care
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Health guidance for pets you love.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-700 sm:text-xl">
              Vetify brings symptom triage, meal planning, anatomy education, and nearby veterinary
              search into one simple place for busy pet owners.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/chat"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start a care chat
              </a>
              <a
                href="/planner"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Plan meals
              </a>
              <a
                href="/map"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Nearest Vets
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

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        {/* Main Footer Content */}
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 0 012-2h14a2 0 012 2v8a2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <span className="text-xl font-black">Vetify</span>
              </div>
              <p className="mt-4 text-slate-400 leading-relaxed">
                Your trusted pet health companion, bringing AI-powered guidance, expert
                veterinarians, and essential pet care tools all in one place.
              </p>
              {/* Social Links */}
              <div className="mt-6 flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Quick Links</h3>
              <ul className="space-y-4">
                <li>
                  <a href="/" className="text-slate-400 hover:text-teal-400 transition">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/services" className="text-slate-400 hover:text-teal-400 transition">
                    Services
                  </a>
                </li>
                <li>
                  <a href="/map" className="text-slate-400 hover:text-teal-400 transition">
                    Find Vets
                  </a>
                </li>
                <li>
                  <a
                    href="/book-appointment"
                    className="text-slate-400 hover:text-teal-400 transition"
                  >
                    Book Appointment
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Resources</h3>
              <ul className="space-y-4">
                <li>
                  <a href="/blogs" className="text-slate-400 hover:text-teal-400 transition">
                    Blogs
                  </a>
                </li>
                <li>
                  <a href="/faqs" className="text-slate-400 hover:text-teal-400 transition">
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="/chat?anatomy=true"
                    className="text-slate-400 hover:text-teal-400 transition"
                  >
                    Anatomy Guide
                  </a>
                </li>
                <li>
                  <a href="/planner" className="text-slate-400 hover:text-teal-400 transition">
                    Meal Planner
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Legal</h3>
              <ul className="space-y-4">
                <li>
                  <a href="/about" className="text-slate-400 hover:text-teal-400 transition">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-slate-400 hover:text-teal-400 transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-slate-400 hover:text-teal-400 transition">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-slate-400 hover:text-teal-400 transition">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} Vetify. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-slate-400">
                <span>Made with ❤️ for pets</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
