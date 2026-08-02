import ScrollReveal from '@/components/ScrollReveal';

export default function ServicesHero() {
  return (
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
            Whether you need to double-check a weird symptom, figure out a better diet, or just find
            the closest vet clinic, we&apos;ve got you covered.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
