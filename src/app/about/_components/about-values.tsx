'use client';

import ScrollReveal from '@/components/ScrollReveal';

export const AboutValues = () => {
  return (
    <ScrollReveal variant="reveal" delay={200}>
      <div className="mt-16 rounded-3xl bg-white p-8 sm:p-12 shadow-xl shadow-slate-200/40 border border-teal-900/10">
        <h3 className="text-2xl font-bold tracking-tight text-slate-950 mb-8">What drives us</h3>
        <div className="grid gap-8 sm:grid-cols-2">
          {/* Fast Help Value */}
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Fast, Accessible Help</h4>
            <p className="text-slate-600 text-sm leading-relaxed">
              Answers shouldn&apos;t be gated behind long wait times. We provide immediate triage
              and guidance 24/7.
            </p>
          </div>

          {/* Evidence-Based Value */}
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
  );
};
