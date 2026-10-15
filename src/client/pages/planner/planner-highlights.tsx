import { ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { plannerHighlights, type PlannerHighlight } from './planner-content';

function Highlight({ item, index }: { item: PlannerHighlight; index: number }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = item.imageSrc && failedSource !== item.imageSrc;
  return (
    <figure className="min-w-0">
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-teal-900/10 bg-gradient-to-br from-[#eff6f3] to-[#e2eeea] sm:rounded-[1.5rem]">
        <span
          aria-hidden="true"
          className="absolute left-4 top-4 rounded-full border border-white/90 bg-white/75 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-teal-800"
        >
          0{index + 1}
        </span>
        {showImage ? (
          <img
            src={item.imageSrc!}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setFailedSource(item.imageSrc)}
          />
        ) : (
          <div
            role="img"
            aria-label={`App highlight ${index + 1} photo placeholder`}
            className="flex flex-col items-center gap-3 px-4 text-center text-teal-700/60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/60">
              <ImageIcon size={27} strokeWidth={1.2} aria-hidden="true" />
            </span>
            <span className="text-xs font-medium">App photo coming soon</span>
          </div>
        )}
      </div>
      <figcaption className="px-1 pt-4 sm:pt-5">
        <h3 className="text-sm font-bold text-slate-950 sm:text-lg">{item.title}</h3>
        <p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">{item.description}</p>
      </figcaption>
    </figure>
  );
}

export default function PlannerHighlights() {
  return (
    <section
      id="app-highlights"
      aria-labelledby="planner-highlights-title"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 xl:py-20">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end xl:mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              A closer look
            </p>
            <h2
              id="planner-highlights-title"
              className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
            >
              Small details. Easier days.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-7 text-slate-500">
            Six highlights from the app. Photos will be added here soon.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
          {plannerHighlights.map((item, index) => (
            <Highlight key={item.title} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
