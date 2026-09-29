import ScrollReveal from '@/components/ScrollReveal';

const features = [
  {
    title: 'AI Vet Assistant',
    description:
      'Ask about symptoms and get calm, practical guidance. When things are complex, we immediately direct you to a pro.',
  },
  {
    title: 'Personalized Meal Plans',
    description:
      "Build nutrition ideas tailored to your pet's age, weight, breed, and allergies. No more generic advice.",
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
  },
  {
    title: 'Hire a Professional',
    description:
      'Connect directly with licensed veterinarians through our platform for one-on-one consultations.',
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="border-b border-teal-900/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-px bg-teal-900/10 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <ScrollReveal key={f.title} variant="reveal" delay={i * 90} className="bg-white">
            <article className="h-full bg-white px-7 py-10 transition-colors hover:bg-vet-bg sm:px-8">
              <h2 className="text-lg font-bold tracking-tight text-vet-ink">{f.title}</h2>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{f.description}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
