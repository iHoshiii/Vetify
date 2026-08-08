import ScrollReveal from '@/components/ScrollReveal';

const steps = [
  {
    num: '01',
    title: 'Describe your concern',
    body: "Tell our AI about your pet's symptoms, diet, or question. No forms, just a conversation.",
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
  },
  {
    num: '02',
    title: 'Get instant guidance',
    body: "Receive calm, evidence-based advice tailored to your pet's breed, age, and condition.",
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
  },
  {
    num: '03',
    title: 'Connect with a vet',
    body: 'If your pet needs professional care, find and book verified local vets in seconds.',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal variant="reveal" className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Simple process
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            How Vetify works
          </h2>
        </ScrollReveal>

        <div className="relative grid gap-8 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-1/2 top-8 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-teal-200 via-blue-200 to-teal-200 md:block"
          />
          {steps.map((s, i) => (
            <ScrollReveal key={s.num} variant="reveal" delay={i * 130}>
              <div className="card-shine group relative rounded-2xl border border-teal-900/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div
                  className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg} text-lg font-black text-white shadow-md ${s.shadow} transition-transform duration-300 group-hover:scale-110`}
                >
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-slate-950">{s.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{s.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
