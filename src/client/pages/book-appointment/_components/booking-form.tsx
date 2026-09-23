import { APPOINTMENT_REASON_MAX, APPOINTMENT_REASON_MIN } from '@shared/limits';
import { useId, useState, type FormEvent } from 'react';

import PetFields, { type PetValues } from './pet-fields';
import PhoneField from './phone-field';
import RequiredMark from './required-mark';
import { FIELD, LABEL } from './styles';

// A soft check so a plainly-wrong address is caught before the request; the server validates in full.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BookingDetails = PetValues & {
  reason: string;
  phone: string;
  clientEmail: string;
};

// Step four: the animal, and why. Species, the reason and a phone are the floor; the
// rest helps the vet but a booking is not blocked on a name the owner has not settled on.
export default function BookingForm({
  isPending,
  error,
  onSubmit,
}: {
  isPending: boolean;
  error: string | null;
  onSubmit: (details: BookingDetails) => void;
}) {
  const ids = {
    petName: useId(),
    petSpecies: useId(),
    petBreed: useId(),
    petAge: useId(),
    reason: useId(),
    phone: useId(),
    clientEmail: useId(),
  };

  const [values, setValues] = useState<BookingDetails>({
    petName: '',
    petSpecies: '',
    petBreed: '',
    petAge: '',
    reason: '',
    phone: '',
    clientEmail: '',
  });

  function set(field: keyof BookingDetails, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const short = values.reason.trim().length < APPOINTMENT_REASON_MIN;
  const badPhone = !/^\+63\d{10}$/.test(values.phone);
  // Empty is allowed; a filled one has to look like an address.
  const badEmail =
    values.clientEmail.trim().length > 0 && !EMAIL_RE.test(values.clientEmail.trim());
  const incomplete = values.petSpecies.trim().length < 2 || short || badPhone || badEmail;

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
        <label htmlFor={ids.clientEmail} className={LABEL}>
          Email (optional)
        </label>
        <input
          id={ids.clientEmail}
          type="email"
          value={values.clientEmail}
          onChange={(event) => set('clientEmail', event.target.value)}
          maxLength={120}
          placeholder="you@example.com"
          className={`${FIELD} mt-1`}
        />
        {/* Left blank, no confirmation is sent — there is nowhere to send it. */}
        <p className="mt-1 text-xs text-slate-500">
          {badEmail
            ? 'That does not look like an email address.'
            : 'Fill this in and we email you a copy once you book.'}
        </p>
      </div>

      <PhoneField id={ids.phone} value={values.phone} onChange={(value) => set('phone', value)} />

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
