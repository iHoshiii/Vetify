'use client';

import ScrollReveal from '@/components/ScrollReveal';

export const AboutStory = () => {
  return (
    <ScrollReveal variant="reveal" delay={100}>
      <div className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-a:text-teal-600">
        <p className="text-xl leading-relaxed text-slate-600 mb-8">
          Vetify was born out of a simple, shared frustration: pet care is often more stressful than
          it needs to be. When your best friend is sick at 2 AM, or when you&apos;re overwhelmed by
          contradictory advice online about what food is safe, waiting days for a vet appointment
          just isn&apos;t an option.
        </p>

        <h2 className="text-2xl font-bold text-slate-950 mt-12 mb-4">The Breaking Point</h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          We realized that pet owners deserve fast, reliable, and evidence-based guidance without
          having to scroll through endless forum threads filled with panic-inducing misinformation.
          We needed a tool that was as smart as it was empathetic.
        </p>
        <p className="text-slate-600 mb-6 leading-relaxed">
          That&apos;s why we brought together a unique team of veterinary professionals, AI
          researchers, and software engineers. We wanted to build a platform that puts the right
          tools directly into the hands of pet parents, right when they need them most.
        </p>

        <h2 className="text-2xl font-bold text-slate-950 mt-12 mb-4">Our Mission</h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          At Vetify, our mission is to make proactive pet care accessible, less stressful, and
          highly informed. We believe that technology should empower, not replace, the bond between
          a pet owner and their local veterinarian.
        </p>
        <p className="text-slate-600 mb-12 leading-relaxed">
          Whether you need to triage a weird symptom with our AI, build a customized meal plan for a
          picky eater, or instantly find a highly-rated clinic nearby when things go wrong, Vetify
          is designed to be your first stop for everyday pet health. For every breed, every budget,
          and every stage of your pet&apos;s life.
        </p>
      </div>
    </ScrollReveal>
  );
};
