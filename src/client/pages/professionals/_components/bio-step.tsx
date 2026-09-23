import { PROFESSIONAL_BIO_MAX, PROFESSIONAL_BIO_MIN } from '@shared/limits';

import ApplyStep from './apply-step';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export default function BioStep({ value, onChange, error }: Props) {
  const remaining = PROFESSIONAL_BIO_MIN - value.trim().length;

  return (
    <ApplyStep
      step={4}
      title="Professional bio"
      note="Introduce yourself to pet owners. This appears on your public profile once approved."
    >
      <label htmlFor="professional-bio" className="text-sm font-bold text-slate-800">
        How you introduce yourself to pet owners
      </label>
      <textarea
        id="professional-bio"
        rows={5}
        maxLength={PROFESSIONAL_BIO_MAX}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
        placeholder="What you practise, where, and how long you have been doing it."
        required
      />
      <p className="mt-1 text-xs text-slate-500">
        {remaining > 0
          ? `${remaining} more characters required.`
          : `${value.trim().length} of ${PROFESSIONAL_BIO_MAX} characters.`}
      </p>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </ApplyStep>
  );
}
