import { useId } from 'react';

import DialogShell, { DIALOG_PRIMARY, DIALOG_SECONDARY } from './dialog-shell';

type Props = {
  open: boolean;
  correct: boolean;
  onCorrect: (confirmed: boolean) => void;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

// What is frozen the moment it is filed, so the tick below is an informed one
const FIXED = [
  'The name, licence number and email a reviewer approved',
  'All three photographs, exactly as the camera took them',
  'The locations you pinned, which are what pet owners are shown',
];

export default function ConfirmApplyDialog(props: Props) {
  const { open, correct, onCorrect, pending, onBack, onSubmit } = props;
  const consentId = useId();

  return (
    <DialogShell
      open={open}
      eyebrow="Last check"
      title="This is filed as it stands"
      lead="Once you submit, none of it can be edited from your dashboard. The application is checked as it was filed."
      onCancel={onBack}
      footer={
        <>
          <label
            htmlFor={consentId}
            className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#0a0c14]"
          >
            <input
              id={consentId}
              type="checkbox"
              checked={correct}
              onChange={(event) => onCorrect(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-400 text-[#16796f] focus:ring-[#16796f]"
            />
            <span className="font-semibold">
              I confirm every detail and photograph in this application is correct.
            </span>
          </label>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onBack} className={DIALOG_SECONDARY}>
              Go back
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!correct || pending}
              className={DIALOG_PRIMARY}
            >
              {pending ? 'Submitting' : 'Submit it'}
            </button>
          </div>
        </>
      }
    >
      <div className="flex-1 overflow-y-auto px-6 sm:px-8">
        <ul className="divide-y divide-[#0a0c14]/10">
          {FIXED.map((item) => (
            <li key={item} className="py-4 text-sm leading-6 text-[#0a0c14]">
              {item}
            </li>
          ))}
        </ul>
        <p className="border-t border-[#0a0c14]/10 py-5 text-sm leading-6 text-slate-600">
          A correction afterwards means writing to support.vetify@gmail.com. Read the four steps
          once more if you are not sure. After this comes the interview, and after that the
          decision.
        </p>
      </div>
    </DialogShell>
  );
}
