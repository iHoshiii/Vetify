import Button from '@/components/ui/Button';

import ApplyStep from './apply-step';

type Props = {
  consent: boolean;
  onConsent: (agreed: boolean) => void;
  error?: string;
  pending: boolean;
  ready: boolean;
  missing: string[];
};

// The star is explained once, here, because it is the only mark the steps use
const NOTE = (
  <>
    Anything still marked <span className="font-bold text-red-500">*</span> is outstanding. The
    button turns on when the application is ready.
  </>
);

export default function ConsentStep({ consent, onConsent, error, pending, ready, missing }: Props) {
  return (
    <ApplyStep step={4} title="Consent and submit" note={NOTE}>
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsent(event.target.checked)}
          required
          aria-invalid={Boolean(error)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
        />
        <span>
          {!consent && (
            <span aria-hidden className="mr-1 font-bold text-red-500">
              *
            </span>
          )}
          I consent to a professional background check, and confirm the licence photographed above
          is current and mine.
          {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
        </span>
      </label>

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
        <Button
          type="submit"
          size="lg"
          loading={pending}
          disabled={!ready}
          className="w-full rounded-xl bg-slate-950 shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:bg-slate-300 sm:w-auto"
        >
          {pending ? 'Submitting' : 'Submit application'}
        </Button>
        {missing.length > 0 && (
          <p className="text-xs text-slate-500">Still to do: {missing.join(', ')}.</p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Nothing is filed until you confirm on the next screen.
        </p>
      </div>
    </ApplyStep>
  );
}
