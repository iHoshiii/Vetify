import ScrollReveal from '@/components/ScrollReveal';

const steps = [
  {
    num: '01',
    title: 'Describe your concern',
    body: "Tell our AI about your pet's symptoms, diet, or question. No forms, just a conversation.",
  },
  {
    num: '02',
    title: 'Get instant guidance',
    body: "Receive calm, evidence-based advice tailored to your pet's breed, age, and condition.",
  },
  {
    num: '03',
    title: 'Connect with a vet',
    body: 'If your pet needs professional care, find and book verified local vets in seconds.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal variant="reveal" className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-vet-primary">
            Simple process
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-vet-ink sm:text-4xl">
            How Vetify works
          </h2>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <ScrollReveal key={s.num} variant="reveal" delay={i * 130}>
              <div className="rounded-2xl border border-teal-900/10 bg-white p-8 transition-colors hover:border-vet-primary/30">
                <span className="text-sm font-bold text-vet-primary">{s.num}</span>
                <h3 className="mt-4 text-lg font-bold text-vet-ink">{s.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{s.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
