import { eligibility } from '../data/prof-data';
import DialogShell, { DIALOG_PRIMARY, DIALOG_SECONDARY } from './dialog-shell';

type Props = { open: boolean; onContinue: () => void; onCancel: () => void };

export default function EligibilityDialog({ open, onContinue, onCancel }: Props) {
  return (
    <DialogShell
      open={open}
      eyebrow="Step 1 of 2"
      title="Eligibility Requirements"
      lead="To maintain the trust of pet owners, we verify every professional before they go live on the platform. Check that all six describe you before you carry on."
      onCancel={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={DIALOG_SECONDARY}>
            Go back
          </button>
          <button type="button" onClick={onContinue} className={DIALOG_PRIMARY}>
            Continue
          </button>
        </div>
      }
    >
      <ul
        tabIndex={0}
        aria-label="Eligibility requirements"
        className="flex-1 divide-y divide-[#0a0c14]/10 overflow-y-auto px-6 outline-none sm:px-8"
      >
        {eligibility.map((item) => (
          <li key={item.title} className="flex gap-4 py-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#55B5C1]/25 text-base">
              {item.icon}
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#0a0c14]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </DialogShell>
  );
}
