import ScrollReveal from '@/components/ScrollReveal';

const features = [
  {
    title: 'AI Vet Assistant',
    description:
      'Ask about symptoms and get calm, practical guidance. When things are complex, we immediately direct you to a pro.',
    emoji: 'AI',
    isText: true,
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
  },
  {
    title: 'Personalized Meal Plans',
    description:
      "Build nutrition ideas tailored to your pet's age, weight, breed, and allergies. No more generic advice.",
    emoji: '🍽️',
    isText: false,
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    emoji: '📍',
    isText: false,
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed veterinarians through our platform for one-on-one consultations.',
    emoji: '👩‍⚕️',
    isText: false,
    bg: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="border-b border-teal-900/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-px bg-teal-900/10 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <ScrollReveal key={f.title} variant="reveal" delay={i * 90} className="bg-white">
            <article className="card-shine group h-full bg-white px-7 py-10 transition-all duration-300 hover:bg-teal-50/50 sm:px-8">
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${
                  f.bg
                } shadow-md ${
                  f.shadow
                } transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                  f.isText ? 'text-sm font-bold text-white' : 'text-xl'
                }`}
              >
                {f.emoji}
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">{f.title}</h2>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{f.description}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
