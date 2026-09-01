import { useAuth } from '@/components/providers/AuthProvider';
import { APPOINTMENT_REASON_MAX, APPOINTMENT_REASON_MIN } from '@shared/limits';
import { useId, useState, type FormEvent } from 'react';

import { FIELD, LABEL } from './styles';

export type BookingDetails = {
  petName: string;
  petSpecies: string;
  reason: string;
  phone: string;
};

/**
 * Step four: the animal, and why. The pet is typed rather than picked — there is no
 * screen to manage one yet, so a picker would be a picker over nothing.
 */
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
  const ids = { name: useId(), species: useId(), reason: useId(), phone: useId() };

  const [values, setValues] = useState<BookingDetails>({
    petName: '',
    petSpecies: '',
    reason: '',
    phone: '',
  });

  function set(field: keyof BookingDetails) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const short = values.reason.trim().length < APPOINTMENT_REASON_MIN;
  const incomplete = !values.petName.trim() || !values.petSpecies.trim() || short;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.name} className={LABEL}>
            Pet name
          </label>
          <input
            id={ids.name}
            value={values.petName}
            onChange={set('petName')}
            required
            maxLength={60}
            placeholder="Milo"
            className={`${FIELD} mt-1`}
          />
        </div>
        <div>
          <label htmlFor={ids.species} className={LABEL}>
            Species
          </label>
          <input
            id={ids.species}
            value={values.petSpecies}
            onChange={set('petSpecies')}
            required
            maxLength={40}
            placeholder="Dog, cat, rabbit…"
            className={`${FIELD} mt-1`}
          />
        </div>
      </div>

      <div>
        <label htmlFor={ids.reason} className={LABEL}>
          What is it about?
        </label>
        {/* A floor, because this is what the vet decides on and "sick" is not actionable. */}
        <textarea
          id={ids.reason}
          value={values.reason}
          onChange={set('reason')}
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
          Phone (optional)
        </label>
        <input
          id={ids.phone}
          type="tel"
          value={values.phone}
          onChange={set('phone')}
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
