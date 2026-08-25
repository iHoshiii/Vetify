import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { professionalKeys, useApplyAsProfessional } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import { professionalApplySchema, type ProfessionalApplyInput } from '@shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

type Errors = Record<string, string | undefined>;

const EMPTY = {
  licenseNumber: '',
  licenseAuthority: '',
  credentialUrls: '',
  specialties: '',
  clinicName: '',
  clinicAddress: '',
  bio: '',
  yearsExperience: '',
};

/** One credential per line: easier to paste into than a repeating field set. */
function linesOf(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((one) => one.trim())
    .filter(Boolean);
}

/** Specialties as a comma-separated list. Deduping happens server-side. */
function listOf(value: string): string[] {
  return value
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean);
}

/** First message per field, which is all a field can show. */
function firstErrors(issues: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(issues).map(([field, list]) => [field, list?.[0]]));
}

export default function ApplyForm() {
  const [values, setValues] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');

  const queryClient = useQueryClient();
  const apply = useApplyAsProfessional();

  function set(field: keyof typeof EMPTY) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage('');

    const payload: ProfessionalApplyInput = {
      licenseNumber: values.licenseNumber,
      licenseAuthority: values.licenseAuthority,
      credentialUrls: linesOf(values.credentialUrls),
      specialties: listOf(values.specialties),
      clinicName: values.clinicName,
      clinicAddress: values.clinicAddress,
      bio: values.bio,
      yearsExperience: values.yearsExperience,
      backgroundCheckConsent: consent,
    };

    // The same schema the route validates with, so the first pass costs no round
    // trip and cannot disagree with the second.
    const parsed = professionalApplySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      setMessage('Please correct the highlighted fields.');
      return;
    }

    apply.mutate(payload, {
      onError: (err) => {
        setMessage(err.message);
        if (!(err instanceof ApiError)) return;

        if (err.issues) setErrors(firstErrors(err.issues));
        // An application filed in another tab. Refetching flips the page to the
        // status view rather than leaving the form arguing with itself.
        if (err.reason === 'already-applied') {
          void queryClient.invalidateQueries({ queryKey: professionalKeys.mine() });
        }
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-5">
      {message && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="License number"
          value={values.licenseNumber}
          onChange={set('licenseNumber')}
          error={errors.licenseNumber}
          placeholder="VET 1234-PH"
          required
        />
        <Input
          label="Issuing authority"
          value={values.licenseAuthority}
          onChange={set('licenseAuthority')}
          error={errors.licenseAuthority}
          placeholder="Professional Regulation Commission"
          required
        />
        <Input
          label="Clinic name"
          value={values.clinicName}
          onChange={set('clinicName')}
          error={errors.clinicName}
          placeholder="Bayside Animal Clinic"
          required
        />
        <Input
          label="Years in practice"
          type="number"
          min={0}
          max={70}
          value={values.yearsExperience}
          onChange={set('yearsExperience')}
          error={errors.yearsExperience}
          required
        />
      </div>

      <Input
        label="Clinic address"
        value={values.clinicAddress}
        onChange={set('clinicAddress')}
        error={errors.clinicAddress}
        placeholder="12 Mabini Street, Cebu City"
        required
      />

      <Input
        label="Specialties (comma separated)"
        value={values.specialties}
        onChange={set('specialties')}
        error={errors.specialties}
        placeholder="dentistry, soft tissue surgery"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="credentialUrls" className="text-sm font-medium text-slate-700">
          Credential links, one per line
        </label>
        <textarea
          id="credentialUrls"
          rows={3}
          value={values.credentialUrls}
          onChange={set('credentialUrls')}
          className={FIELD}
          required
        />
        <p className="text-xs text-slate-500">
          A scan of your license, your diploma, and any specialist certificates. A reviewer reads
          these; the directory never shows them.
        </p>
        {errors.credentialUrls && (
          <p className="text-xs font-medium text-red-500">{errors.credentialUrls}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-slate-700">
          How you introduce yourself to pet owners
        </label>
        <textarea
          id="bio"
          rows={5}
          value={values.bio}
          onChange={set('bio')}
          className={FIELD}
          placeholder="What you practise, where, and how long you have been doing it."
          required
        />
        {errors.bio && <p className="text-xs font-medium text-red-500">{errors.bio}</p>}
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          I consent to a professional background check, and confirm the license above is current and
          mine.
          {errors.backgroundCheckConsent && (
            <span className="mt-1 block text-xs font-medium text-red-500">
              {errors.backgroundCheckConsent}
            </span>
          )}
        </span>
      </label>

      <Button type="submit" size="lg" loading={apply.isPending}>
        {apply.isPending ? 'Submitting' : 'Submit application'}
      </Button>
    </form>
  );
}
