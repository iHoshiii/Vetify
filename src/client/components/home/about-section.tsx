import ScrollReveal from '@/components/ScrollReveal';
import { Link } from 'react-router-dom';

export default function AboutSection() {
  return (
    <section id="about" className="bg-vet-bg py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <ScrollReveal variant="reveal-left">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-vet-primary">About us</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-vet-ink sm:text-4xl">
            Built by pet lovers, for pet lovers.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Vetify was born out of a simple frustration. Pet owners deserve fast, reliable guidance
            without having to scroll through forums or wait days for an appointment. We built a
            platform that puts the right tools in your hands, right when you need them.
          </p>
          <p className="mt-4 leading-8 text-slate-500">
            Our team combines veterinary knowledge, AI research, and software engineering to make
            pet care less stressful and more informed, for every breed, every budget, and every
            stage of your pet&apos;s life.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/about"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-vet-primary px-6 text-sm font-bold text-white transition-colors hover:bg-vet-primary-dark"
            >
              Our full story
            </Link>
            <Link
              to="/services"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:border-slate-900/30"
            >
              Services
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
