'use client';

import { AboutCTA } from './_components/about-cta';
import { AboutHero } from './_components/about-hero';
import { AboutStory } from './_components/about-story';
import { AboutValues } from './_components/about-values';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <AboutHero />

      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-20 sm:pb-28">
        <AboutStory />
        <AboutValues />
      </section>

      <AboutCTA />
    </main>
  );
}
