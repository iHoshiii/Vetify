import ScrollReveal from '@/components/ScrollReveal';

const services = [
  {
    title: 'AI Symptom Triage',
    description:
      "Describe your pet's symptoms in plain English. Our advanced AI analyzes the information to provide calm, practical, and evidence-based guidance. If the situation appears critical, we instantly direct you to professional care.",
    icon: '🤖',
    bg: 'from-teal-400 to-teal-600',
    shadow: 'shadow-teal-500/30',
    href: '/chat',
    features: ['24/7 Availability', 'Breed-Specific Analysis', 'Emergency Detection'],
  },
  {
    title: 'Interactive Anatomy',
    description:
      'Learn how your pet works from the inside out. Our interactive 3D models of dogs, cats, and birds let you explore different body systems to better understand their health, function, and potential issues.',
    icon: '🦴',
    bg: 'from-indigo-400 to-indigo-600',
    shadow: 'shadow-indigo-500/30',
    href: '/chat?anatomy=true',
    features: ['Dogs, Cats & Birds', 'System Breakdowns', 'Health Insights'],
  },
  {
    title: 'Personalized Nutrition',
    description:
      "Generic kibble advice isn't enough. Get customized meal plans and dietary recommendations tailored to your pet's specific age, weight, breed, activity level, and known allergies.",
    icon: '🥗',
    bg: 'from-emerald-400 to-emerald-600',
    shadow: 'shadow-emerald-500/30',
    href: '/planner',
    features: ['Allergy Consideration', 'Age-Appropriate Diet', 'Weight Management'],
  },
  {
    title: 'Find Nearby Vets',
    description:
      'When you need professional help fast, our interactive map locates verified, highly-rated veterinary clinics in your immediate area. Filter by specialty and get turn-by-turn directions instantly.',
    icon: '📍',
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
    href: '/map',
    features: ['Real-time Location', 'Verified Clinics', 'Instant Directions'],
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed, vetted veterinarians through our secure platform. Book one-on-one consultations for peace of mind when your pet needs expert attention.',
    icon: '👩‍⚕️',
    bg: 'from-rose-400 to-rose-600',
    shadow: 'shadow-rose-500/30',
    href: '/book-appointment',
    features: ['Licensed Vets', 'Secure Booking', 'Direct Communication'],
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Stay informed with expertly written articles from veterinary professionals. Dive deep into topics covering pet health, behavioral training, seasonal risks, and local clinic spotlights.',
    icon: '📝',
    bg: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/30',
    href: '/blogs',
    features: ['Expert Authored', 'Behavioral Tips', 'Health Deep-dives'],
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ══ HERO SECTION ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 px-5 py-24 sm:px-8 lg:py-32">
        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-teal-500/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <ScrollReveal variant="reveal">
            <p className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              Comprehensive Care
            </p>
            <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Everything you need <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">
                for your pet&apos;s health
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              From instant AI-powered symptom analysis to booking appointments with local
              professionals, Vetify provides a complete ecosystem of tools designed to keep your
              best friend happy and healthy.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ SERVICES GRID ════════════════════════════════════════════ */}
      <section className="relative mx-auto -mt-10 max-w-7xl px-5 sm:px-8 pb-24 lg:pb-32">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} variant="reveal-scale" delay={i * 100}>
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:-translate-y-2 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-900/10 relative overflow-hidden">
                {/* Hover gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

                <div className="relative z-10 flex-1">
                  <div
                    className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${service.bg} text-2xl shadow-lg ${service.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                  >
                    {service.icon}
                  </div>

                  <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-4">
                    {service.title}
                  </h2>
                  <p className="leading-relaxed text-slate-600 mb-8">{service.description}</p>
                </div>

                <div className="relative z-10 mt-auto">
                  <div className="mb-6 space-y-2">
                    {service.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500"
                      >
                        <svg
                          className="h-4 w-4 text-teal-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <a
                    href={service.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors duration-300 group-hover:bg-teal-600 group-hover:text-white"
                  >
                    Explore Service
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══ BOTTOM CTA ══════════════════════════════════════════════ */}
      <section className="border-t border-slate-200 bg-white py-24">
        <ScrollReveal variant="reveal" className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Not sure where to start?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Tell our AI assistant what&apos;s on your mind. Whether it&apos;s a weird symptom or a
            question about diet, we&apos;ll guide you to the right tool.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/chat"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-8 text-sm font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-1 hover:shadow-teal-500/40"
            >
              Start a Conversation
            </a>
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
            >
              Contact Support
            </a>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
