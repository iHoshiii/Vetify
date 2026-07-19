'use client';

import ScrollReveal from '@/components/ScrollReveal';

export const AboutHero = () => {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f6fbfb] via-transparent to-[#f6fbfb]" />

      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <ScrollReveal variant="reveal">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Our Full Story
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Built by pet lovers, <br className="hidden sm:block" />
            for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
              pet lovers.
            </span>
          </h1>
        </ScrollReveal>
      </div>
    </section>
  );
};
