import ScrollReveal from '@/components/ScrollReveal';
import { services } from '../data/services';

export default function ServicesGrid() {
  return (
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
  );
}
