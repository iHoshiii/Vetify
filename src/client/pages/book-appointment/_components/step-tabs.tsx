export type Stage = 1 | 2 | 3 | 4;

export const STAGES: Stage[] = [1, 2, 3, 4];

/** What each tab is called, short enough that four of them fit a phone. */
const LABEL: Record<Stage, string> = {
  1: 'Visit type',
  2: 'Vet',
  3: 'Time',
  4: 'Details',
};

const TAB =
  'flex w-full min-w-0 flex-col gap-0.5 border-b-2 px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
const ON = 'border-teal-700';
const OFF = 'border-slate-900/10 hover:border-slate-900/30';
const LOCKED = 'border-slate-900/10 cursor-not-allowed';

/**
 * The four steps as tabs, one open at a time.
 *
 * A tab is locked until the answers before it exist, because step three is a question
 * about a vet nobody has chosen yet. Going back is always allowed: the answer already
 * given is on the tab, so somebody can see what they would be changing.
 */
export default function StepTabs({
  stage,
  reached,
  answers,
  onGo,
}: {
  stage: Stage;
  reached: Stage;
  answers: Record<Stage, string | null>;
  onGo: (stage: Stage) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Booking steps"
      className="mt-8 grid grid-cols-2 gap-x-2 rounded-xl border border-slate-900/10 bg-white p-1 shadow-sm sm:grid-cols-4"
    >
      {STAGES.map((step) => {
        const open = step === stage;
        const locked = step > reached;

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={open}
            disabled={locked}
            onClick={() => onGo(step)}
            className={`${TAB} ${open ? ON : locked ? LOCKED : OFF}`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  open
                    ? 'bg-teal-800 text-white'
                    : locked
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-teal-900/10 text-teal-900'
                }`}
              >
                {step}
              </span>
              <span
                className={`truncate text-xs font-black uppercase tracking-wider ${
                  locked ? 'text-slate-300' : open ? 'text-slate-950' : 'text-slate-500'
                }`}
              >
                {LABEL[step]}
              </span>
            </span>

            <span
              className={`truncate pl-7 text-xs ${locked ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {answers[step] ?? '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
