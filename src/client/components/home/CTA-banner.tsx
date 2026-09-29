import ScrollReveal from '@/components/ScrollReveal';
import { Link } from 'react-router-dom';

export default function CtaBanner() {
  return (
    <ScrollReveal variant="reveal">
      <section className="bg-vet-ink px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-vet-accent">
              Vet professional? Be part of Vetify.
            </p>
            <h2 className="mt-3 max-w-2xl text-xl font-semibold leading-8 tracking-tight text-white/90">
              Join a community of dedicated veterinary professionals providing trusted, accessible
              guidance to pet parents when they need it most.
            </h2>
          </div>
          <Link
            to="/professionals"
            className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-vet-ink transition-colors hover:bg-vet-bg md:w-auto"
          >
            See more
          </Link>
        </div>
      </section>
    </ScrollReveal>
  );
}
