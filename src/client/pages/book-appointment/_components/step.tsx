import type { ReactNode } from 'react';

/** A numbered heading, so the flow reads as a sequence rather than one long form. */
export default function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-950">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-800 text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
