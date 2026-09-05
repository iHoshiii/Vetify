import { useTermsGate } from '@/hooks/use-terms-gate';
import { useId } from 'react';

import { conditions } from '../data/prof-data';
import DialogShell, { DIALOG_PRIMARY, DIALOG_SECONDARY } from './dialog-shell';

type Props = { open: boolean; onAccept: () => void; onBack: () => void; onCancel: () => void };

export default function TermsDialog({ open, onAccept, onBack, onCancel }: Props) {
  const { agreed, setAgreed, secondsLeft, counting, canAgree, list, onListScroll } =
    useTermsGate(open);
  const consentId = useId();

  return (
    <DialogShell
      open={open}
      eyebrow="Step 2 of 2"
      title="Terms & Conditions"
      lead="By joining as a professional, you agree to abide by the following platform conditions."
      onCancel={onCancel}
      footer={
        <>
          <div className="flex items-start justify-between gap-4">
            <label
              htmlFor={consentId}
              className={`flex items-start gap-3 text-sm ${
                canAgree ? 'cursor-pointer text-[#0a0c14]' : 'cursor-not-allowed text-slate-400'
              }`}
            >
              <input
                id={consentId}
                type="checkbox"
                checked={agreed}
                disabled={!canAgree}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400 text-[#16796f] focus:ring-[#16796f] disabled:cursor-not-allowed"
              />
              <span className="font-semibold">
                I have read these conditions and agree to be bound by them.
              </span>
            </label>

            {counting && (
              <span className="shrink-0 rounded-md bg-[#55B5C1]/20 px-2.5 py-1 text-xs font-black tabular-nums text-[#16796f]">
                {secondsLeft}s
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onBack} className={DIALOG_SECONDARY}>
              Go back
            </button>
            <button type="button" onClick={onAccept} disabled={!agreed} className={DIALOG_PRIMARY}>
              Agree and continue
            </button>
          </div>
        </>
      }
    >
      <ol
        ref={list}
        onScroll={onListScroll}
        tabIndex={0}
        aria-label="Platform conditions"
        className="flex-1 divide-y divide-[#0a0c14]/10 overflow-y-auto px-6 outline-none sm:px-8"
      >
        {conditions.map((item) => (
          <li key={item.num} className="flex gap-4 py-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#55B5C1]/25 text-xs font-black text-[#16796f]">
              {item.num}
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#0a0c14]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </DialogShell>
  );
}
