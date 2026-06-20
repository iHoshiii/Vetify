import FloatingBones from '@/components/FloatingBones';

const features = [
  {
    title: 'AI Vet Assistant',
    description:
      'Ask about symptoms and get calm, practical guidance. When things are complex, we immediately direct you to a pro.',
    icon: (
      <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
        AI
      </div>
    ),
  },
  {
    title: 'Personalized Meal Plans',
    description:
      "Build nutrition ideas tailored to your pet's age, weight, breed, and allergies. No more generic advice.",
    icon: (
      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
        🍽️
      </div>
    ),
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    icon: (
      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
        📍
      </div>
    ),
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed veterinarians through our platform for one-on-one consultations.',
    icon: (
      <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
        👩‍⚕️
      </div>
    ),
  },
];

const moreFeatures = [
  {
    title: 'Interactive Anatomy',
    description:
      'Explore the anatomy of dogs, cats, and birds. Click on different parts to learn about their health and function.',
    icon: (
      <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-2xl">
        🦴
      </div>
    ),
    href: '/chat?anatomy=true',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read articles from veterinary professionals about pet health, behavior, and local clinic spotlights.',
    icon: (
      <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-white text-2xl">
        📝
      </div>
    ),
    href: '/blogs',
  },
  {
    title: 'Pet Meal Plan',
    description:
      "Get custom weekly meal plans designed specifically for your pet's unique dietary needs and preferences.",
    icon: (
      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl">
        🥗
      </div>
    ),
    href: '/planner',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
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
        <FloatingBones />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 justify-center px-5 pb-12 pt-8 sm:px-8">
          <div className="max-w-3xl text-center">
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
                  <span className="ml-1">→</span>
                </div>
              </a>
            ))}
          </div>
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

      <footer className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
                  V
                </div>
                <span className="text-xl font-black">Vetify</span>
              </div>
              <p className="mt-4 text-slate-400 leading-relaxed">
                Your trusted pet health companion, bringing AI-powered guidance, expert
                veterinarians, and essential pet care tools all in one place.
              </p>
              <div className="mt-6 flex gap-4">
                {['twitter', 'instagram', 'facebook'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition"
                  >
                    {social[0].toUpperCase()}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Quick Links</h3>
              <ul className="space-y-4">
                {['Home', 'Services', 'Find Vets', 'Book Appointment'].map((link, i) => (
                  <li key={i}>
                    <a
                      href={
                        i === 0
                          ? '/'
                          : i === 1
                          ? '/services'
                          : i === 2
                          ? '/map'
                          : '/book-appointment'
                      }
                      className="text-slate-400 hover:text-teal-400 transition"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Resources</h3>
              <ul className="space-y-4">
                {['Blogs', 'FAQs', 'Anatomy Guide', 'Meal Planner'].map((link, i) => (
                  <li key={i}>
                    <a
                      href={
                        i === 0
                          ? '/blogs'
                          : i === 1
                          ? '/faqs'
                          : i === 2
                          ? '/chat?anatomy=true'
                          : '/planner'
                      }
                      className="text-slate-400 hover:text-teal-400 transition"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Legal</h3>
              <ul className="space-y-4">
                {['About Us', 'Privacy Policy', 'Terms of Service', 'Contact Us'].map((link, i) => (
                  <li key={i}>
                    <a
                      href={
                        i === 0 ? '/about' : i === 1 ? '/privacy' : i === 2 ? '/terms' : '/contact'
                      }
                      className="text-slate-400 hover:text-teal-400 transition"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-80">
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
