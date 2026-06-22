import ScrollReveal from '@/components/ScrollReveal';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f6fbfb] via-transparent to-[#f6fbfb]"></div>

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

      {/* ── THE STORY ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-20 sm:pb-28">
        <ScrollReveal variant="reveal" delay={100}>
          <div className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-a:text-teal-600">
            <p className="text-xl leading-relaxed text-slate-600 mb-8">
              Vetify was born out of a simple, shared frustration: pet care is often more stressful
              than it needs to be. When your best friend is sick at 2 AM, or when you&apos;re
              overwhelmed by contradictory advice online about what food is safe, waiting days for a
              vet appointment just isn&apos;t an option.
            </p>

            <h2 className="text-2xl font-bold text-slate-950 mt-12 mb-4">The Breaking Point</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              We realized that pet owners deserve fast, reliable, and evidence-based guidance
              without having to scroll through endless forum threads filled with panic-inducing
              misinformation. We needed a tool that was as smart as it was empathetic.
            </p>
            <p className="text-slate-600 mb-6 leading-relaxed">
              That&apos;s why we brought together a unique team of veterinary professionals, AI
              researchers, and software engineers. We wanted to build a platform that puts the right
              tools directly into the hands of pet parents, right when they need them most.
            </p>

            <h2 className="text-2xl font-bold text-slate-950 mt-12 mb-4">Our Mission</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              At Vetify, our mission is to make proactive pet care accessible, less stressful, and
              highly informed. We believe that technology should empower, not replace, the bond
              between a pet owner and their local veterinarian.
            </p>
            <p className="text-slate-600 mb-12 leading-relaxed">
              Whether you need to triage a weird symptom with our AI, build a customized meal plan
              for a picky eater, or instantly find a highly-rated clinic nearby when things go
              wrong, Vetify is designed to be your first stop for everyday pet health. For every
              breed, every budget, and every stage of your pet&apos;s life.
            </p>
          </div>
        </ScrollReveal>

        {/* ── CORE VALUES ───────────────────────────────────────── */}
        <ScrollReveal variant="reveal" delay={200}>
          <div className="mt-16 rounded-3xl bg-white p-8 sm:p-12 shadow-xl shadow-slate-200/40 border border-teal-900/10">
            <h3 className="text-2xl font-bold tracking-tight text-slate-950 mb-8">
              What drives us
            </h3>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Fast, Accessible Help</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Answers shouldn&apos;t be gated behind long wait times. We provide immediate
                  triage and guidance 24/7.
                </p>
              </div>
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Evidence-Based</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every piece of advice and every tool is built alongside licensed veterinary
                  professionals.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────── */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Want to learn more?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            If you share our passion for improving pet care or want to join our network of
            professionals, we&apos;d love to connect.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5"
            >
              Contact Us
            </a>
            <a
              href="/services"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
            >
              Explore Services
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
