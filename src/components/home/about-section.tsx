import ScrollReveal from '@/components/ScrollReveal';

const stats = [
  {
    value: '0',
    label: 'Pet owners helped',
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/20',
  },
  {
    value: '0',
    label: 'Satisfaction rate',
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/20',
  },
  {
    value: '0',
    label: 'Species supported',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/20',
  },
  {
    value: '0',
    label: 'AI always on',
    bg: 'from-emerald-500 to-emerald-700',
    shadow: 'shadow-emerald-500/20',
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="bg-[#f6fbfb] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <ScrollReveal variant="reveal-left">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">About us</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Built by pet lovers,
              <br className="hidden sm:block" /> for pet lovers.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Vetify was born out of a simple frustration — pet owners deserve fast, reliable
              guidance without having to scroll through forums or wait days for an appointment. We
              built a platform that puts the right tools in your hands, right when you need them.
            </p>
            <p className="mt-4 max-w-lg leading-8 text-slate-500">
              Our team combines veterinary knowledge, AI research, and software engineering to make
              pet care less stressful and more informed — for every breed, every budget, and every
              stage of your pet&apos;s life.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/about"
                className="btn-glow inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
              >
                Our full story
              </a>
              <a
                href="/services"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
              >
                Services
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="reveal-right">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`card-shine rounded-2xl bg-gradient-to-br ${stat.bg} p-7 shadow-lg ${stat.shadow}`}
                >
                  <p className="stat-num text-4xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
