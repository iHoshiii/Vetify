import ScrollReveal from '@/components/ScrollReveal';
import { SiteLink } from '@/components/common/site-link';

const moreFeatures = [
  {
    title: 'Veterinary Blogs',
    description:
      'Read articles from veterinary professionals about pet health, behavior, and local clinic spotlights.',
    href: '/blogs',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'Locate verified veterinary clinics in your area with our interactive map. Get directions instantly.',
    href: '/map',
  },
  {
    title: 'Interactive Anatomy',
    description:
      'Explore the anatomy of dogs, cats, and birds. Click on different parts to learn about their health and function.',
    href: '/anatomy',
  },
  {
    title: 'Join as a Professional',
    description:
      'Are you a licensed veterinarian? Partner with Vetify to reach pet owners who need your expertise, on your schedule.',
    href: '/contact',
  },
];

export default function MoreFeatures() {
  return (
    <section className="bg-vet-bg py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal variant="reveal" className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-vet-primary">
            More for your pet
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-vet-ink sm:text-4xl">
            Everything you need in one app
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            All the tools a pet owner could need, thoughtfully brought together.
          </p>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {moreFeatures.map((f, i) => (
            <ScrollReveal key={f.title} variant="reveal-scale" delay={i * 110}>
              <SiteLink
                to={f.href}
                className="group flex h-full flex-col rounded-2xl border border-teal-900/10 bg-white p-8 transition-colors hover:border-vet-primary/30"
              >
                <h3 className="text-xl font-bold text-vet-ink">{f.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{f.description}</p>
                <span className="mt-6 text-sm font-semibold text-vet-primary">Explore</span>
              </SiteLink>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
