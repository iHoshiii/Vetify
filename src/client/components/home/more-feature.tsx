import ScrollReveal from '@/components/ScrollReveal';

const moreFeatures = [
  {
    title: 'Veterinary Blogs',
    description:
      'Read articles from veterinary professionals about pet health, behavior, and local clinic spotlights.',
    icon: '📝',
    bg: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/30',
    hover: 'group-hover:text-amber-600',
    href: '/blogs',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    icon: '📍',
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
    hover: 'group-hover:text-orange-600',
    href: '/map',
  },
  {
    title: 'Interactive Anatomy',
    description:
      'Explore the anatomy of dogs, cats, and birds. Click on different parts to learn about their health and function.',
    icon: '🦴',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
    hover: 'group-hover:text-indigo-600',
    href: '/chat?anatomy=true',
  },
  {
    title: 'Join as a Professional',
    description:
      'Are you a licensed veterinarian? Partner with Vetify to reach pet owners who need your expertise — on your schedule.',
    icon: '👩‍⚕️',
    bg: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
    hover: 'group-hover:text-pink-600',
    href: '/contact',
  },
];

export default function MoreFeatures() {
  return (
    <section className="relative overflow-hidden bg-[#f6fbfb] py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, #0d9488 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal variant="reveal" className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            More for your pet
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Everything you need in one app
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            All the tools a pet owner could need, thoughtfully brought together.
          </p>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {moreFeatures.map((f, i) => (
            <ScrollReveal key={f.title} variant="reveal-scale" delay={i * 110}>
              <a
                href={f.href}
                className="card-shine group flex h-full flex-col rounded-2xl border border-teal-900/10 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-teal-500/30 hover:shadow-xl"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${f.bg} text-2xl shadow-md ${f.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  {f.icon}
                </div>
                <h3
                  className={`text-xl font-bold text-slate-950 transition-colors duration-200 ${f.hover}`}
                >
                  {f.title}
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{f.description}</p>
                <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-teal-700 transition-all duration-300 group-hover:gap-2">
                  Explore
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
