import { useAuth } from '@/components/providers/AuthProvider';
import { APPOINTMENT_REASON_MAX, APPOINTMENT_REASON_MIN } from '@shared/limits';
import { useId, useState, type FormEvent } from 'react';

import PetFields, { type PetValues } from './pet-fields';
import RequiredMark from './required-mark';
import { FIELD, LABEL } from './styles';

// A first pass so a plainly-wrong number is caught before the request; the server validates in full.
const PHONE_RE = /^[+(]?\d[\d\s()+-]{5,}$/;

export type BookingDetails = PetValues & {
  reason: string;
  phone: string;
};

// Step four: the animal, and why. Species and the reason are the floor; the rest helps
// the vet but a booking is not blocked on a name the owner has not settled on.
export default function BookingForm({
  isPending,
  error,
  onSubmit,
}: {
  isPending: boolean;
  error: string | null;
  onSubmit: (details: BookingDetails) => void;
}) {
  const { user } = useAuth();
  const ids = {
    petName: useId(),
    petSpecies: useId(),
    petBreed: useId(),
    petAge: useId(),
    reason: useId(),
    phone: useId(),
  };

  const [values, setValues] = useState<BookingDetails>({
    petName: '',
    petSpecies: '',
    petBreed: '',
    petAge: '',
    reason: '',
    phone: '',
  });

  function set(field: keyof BookingDetails, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const short = values.reason.trim().length < APPOINTMENT_REASON_MIN;
  const badPhone = !PHONE_RE.test(values.phone.trim());
  const incomplete = !values.petSpecies.trim() || short || badPhone;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <PetFields ids={ids} values={values} onChange={set} />

      <div>
        <label htmlFor={ids.reason} className={LABEL}>
          What is it about?
          <RequiredMark filled={!short} />
        </label>
        {/* A floor, because this is what the vet decides on and "sick" is not actionable. */}
        <textarea
          id={ids.reason}
          value={values.reason}
          onChange={(event) => set('reason', event.target.value)}
          required
          rows={4}
          maxLength={APPOINTMENT_REASON_MAX}
          placeholder="A rash on his back leg that is not settling down."
          className={`${FIELD} mt-1`}
        />
        <p className="mt-1 text-xs text-slate-500">
          {short
            ? `At least ${APPOINTMENT_REASON_MIN} characters — this is what the vet decides on.`
            : `${values.reason.trim().length} of ${APPOINTMENT_REASON_MAX}`}
        </p>
      </div>

      <div>
        <label htmlFor={ids.phone} className={LABEL}>
          Phone
          <RequiredMark filled={!badPhone} />
        </label>
        <input
          id={ids.phone}
          type="tel"
          value={values.phone}
          onChange={(event) => set('phone', event.target.value)}
          required
          maxLength={32}
          placeholder="+63 32 555 0101"
          className={`${FIELD} mt-1`}
        />
        <p className="mt-1 text-xs text-slate-500">
          Given to this vet only, so they can reach you about this booking. They already have{' '}
          {user?.email ?? 'your email address'}.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || incomplete}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-800 px-6 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Asking…' : 'Request this appointment'}
      </button>
    </form>
  );
}
