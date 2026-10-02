import { Link } from 'react-router-dom';

import ScrollReveal from '@/components/ScrollReveal';
import { services } from '../data/services-data';

export default function ServicesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-24 sm:pb-32">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <ScrollReveal key={service.title} variant="reveal" delay={i * 80}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-colors duration-200 hover:bg-vet-bg">
              <h2 className="text-xl font-bold tracking-tight text-vet-ink mb-3">
                {service.title}
              </h2>

              <p className="flex-1 leading-relaxed text-slate-600 mb-8">{service.description}</p>

              <Link
                to={service.href}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-colors duration-200 hover:text-vet-primary border border-slate-200"
              >
                {service.actionText}
              </Link>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
