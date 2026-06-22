import ScrollReveal from '@/components/ScrollReveal';

const services = [
  {
    title: 'AI Symptom Triage',
    description:
      "Tell our AI about your pet's symptoms in plain English. It analyzes the details to give you calm, practical advice. If things look serious, it'll tell you to see a vet immediately.",
    icon: '🤖',
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
    href: '/chat',
    actionText: 'Ask the AI',
  },
  {
    title: 'Interactive Anatomy',
    description:
      "Click through 3D models of dogs, cats, and birds to see how their bodies actually work. It's an easy way to understand their health and where issues might be coming from.",
    icon: '🦴',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
    href: '/chat?anatomy=true',
    actionText: 'Explore anatomy',
  },
  {
    title: 'Personalized Nutrition',
    description:
      "Stop guessing with generic kibble. Input your pet's age, weight, and allergies to get customized meal ideas and dietary recommendations that actually fit their needs.",
    icon: '🥗',
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
    href: '/planner',
    actionText: 'Plan a meal',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'When you need a professional right away, our map shows you verified, highly-rated clinics near you. You can check their specialties and get directions instantly.',
    icon: '📍',
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
    href: '/map',
    actionText: 'Find a clinic',
  },
  {
    title: 'Hire a Professional',
    description:
      'Sometimes you just need to talk to a real vet. Use our platform to connect with licensed veterinarians and book one-on-one consultations.',
    icon: '👩‍⚕️',
    bg: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
    href: '/book-appointment',
    actionText: 'Book appointment',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read straightforward articles written by veterinary professionals. We cover behavioral training, seasonal health risks, and spotlight local clinics you should know about.',
    icon: '📝',
    bg: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/30',
    href: '/blogs',
    actionText: 'Read articles',
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ══ HERO SECTION ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <ScrollReveal variant="reveal">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              Our Services
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Practical tools for <br className="hidden sm:block" />
              everyday pet care.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Whether you need to double-check a weird symptom, figure out a better diet, or just
              find the closest vet clinic, we&apos;ve got you covered.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ SERVICES GRID ════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-24 sm:pb-32">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} variant="reveal" delay={i * 80}>
              <div className="group flex h-full flex-col rounded-2xl border border-teal-900/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-teal-500/20">
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${service.bg} text-2xl text-white shadow-md ${service.shadow} transition-transform duration-300 group-hover:scale-105`}
                >
                  {service.icon}
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-950 mb-3">
                  {service.title}
                </h2>

                <p className="flex-1 leading-relaxed text-slate-600 mb-8">{service.description}</p>

                <a
                  href={service.href}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-teal-50 hover:text-teal-700 border border-slate-100"
                >
                  {service.actionText}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══ BOTTOM CTA ══════════════════════════════════════════════ */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Still looking for answers?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            If you&apos;re not sure which tool you need, try asking our AI assistant first. It can
            point you in the right direction.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="/chat"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5"
            >
              Ask the AI
            </a>
            <a
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
