import type { ReactNode } from 'react';

type Props = { step: number; title: string; note: ReactNode; children: ReactNode };

// One shell for every stage, so the page reads as four stops instead of five loose cards
export default function ApplyStep({ step, title, note, children }: Props) {
  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#55B5C1]/25 text-xs font-black text-[#16796f]">
          {step}
        </span>
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{note}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
