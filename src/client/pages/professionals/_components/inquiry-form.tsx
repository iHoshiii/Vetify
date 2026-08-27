import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useSendInquiry } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import { PROFESSIONAL_MOTIVATION_MAX, PROFESSIONAL_MOTIVATION_MIN } from '@shared/limits';
import { professionalInquirySchema, type ProfessionalInquiryInput } from '@shared/schemas';
import { useState, type FormEvent } from 'react';

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

type Errors = Record<string, string | undefined>;

const EMPTY = {
  name: '',
  email: '',
  licenseNumber: '',
  currentLocation: '',
  clinicLocation: '',
  motivation: '',
  phone: '',
  yearsExperience: '',
};

/** First message per field, which is all a field can show. */
function firstErrors(issues: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(issues).map(([field, list]) => [field, list?.[0]]));
}

/**
 * Stage one: the short form anybody can send.
 *
 * Nothing here is checked against anything — the name and the email are the
 * sender's own claim, and the whole point of the screen is to be cheap to fill in
 * and cheap to refuse. What it collects is what a reviewer needs to decide whether
 * to send the real application: who you are, what licence you hold, where you
 * practise, and why you want in.
 */
export default function InquiryForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');

  const send = useSendInquiry();

  function set(field: keyof typeof EMPTY) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage('');

    const payload: ProfessionalInquiryInput = {
      name: values.name,
      email: values.email,
      licenseNumber: values.licenseNumber,
      currentLocation: values.currentLocation,
      clinicLocation: values.clinicLocation,
      motivation: values.motivation,
      phone: values.phone,
      yearsExperience: values.yearsExperience,
    };

    // The same schema the route validates with, so the first pass costs no round
    // trip and cannot disagree with the second.
    const parsed = professionalInquirySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      setMessage('Please correct the highlighted fields.');
      return;
    }

    send.mutate(payload, {
      onError: (err) => {
        setMessage(err.message);
        if (err instanceof ApiError && err.issues) setErrors(firstErrors(err.issues));
      },
    });
  }

  if (send.isSuccess) {
    return (
      <div className="mt-10 rounded-lg border border-teal-900/15 bg-teal-50/70 p-6">
        <h2 className="text-lg font-black tracking-tight">Thank you — that is with us.</h2>
        <p className="mt-2 leading-7 text-slate-700">
          A reviewer reads every enquiry. If yours goes through, you will get an email with a link
          to the full application — the one that asks for your photographs, your licence card and
          your address. Watch the inbox for <strong>{values.email.trim().toLowerCase()}</strong>.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Nothing else is needed from you in the meantime, and there is no queue position to check.
        </p>
      </div>
    );
  }

  const motivationLeft = PROFESSIONAL_MOTIVATION_MIN - values.motivation.trim().length;

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
          label="Your name"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="Dr Marites Reyes"
          required
        />
        <Input
          label="Email address"
          type="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          placeholder="you@clinic.ph"
          required
        />
        <Input
          label="License number"
          value={values.licenseNumber}
          onChange={set('licenseNumber')}
          error={errors.licenseNumber}
          placeholder="VET 1234-PH"
          required
        />
        <Input
          label="Contact number (optional)"
          value={values.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="+63 32 555 0101"
        />
        <Input
          label="Where you are based"
          value={values.currentLocation}
          onChange={set('currentLocation')}
          error={errors.currentLocation}
          placeholder="Cebu City, Cebu"
          required
        />
        <Input
          label="Where you practise (optional)"
          value={values.clinicLocation}
          onChange={set('clinicLocation')}
          error={errors.clinicLocation}
          placeholder="Mandaue, Cebu"
        />
        <Input
          label="Years in practice (optional)"
          type="number"
          min={0}
          max={70}
          value={values.yearsExperience}
          onChange={set('yearsExperience')}
          error={errors.yearsExperience}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="motivation" className="text-sm font-medium text-slate-700">
          Why do you want to join our team?
        </label>
        <textarea
          id="motivation"
          rows={6}
          maxLength={PROFESSIONAL_MOTIVATION_MAX}
          value={values.motivation}
          onChange={set('motivation')}
          className={FIELD}
          placeholder="What you practise, who you look after, and what you would want out of being listed here."
          required
        />
        <p className="text-xs text-slate-500">
          {motivationLeft > 0
            ? `${motivationLeft} more characters — this is the whole basis for the decision, so a line or two of it helps.`
            : `${values.motivation.trim().length} of ${PROFESSIONAL_MOTIVATION_MAX} characters.`}
        </p>
        {errors.motivation && (
          <p className="text-xs font-medium text-red-500">{errors.motivation}</p>
        )}
      </div>

      <Button type="submit" size="lg" loading={send.isPending}>
        {send.isPending ? 'Sending' : 'Send enquiry'}
      </Button>

      <p className="text-xs leading-5 text-slate-500">
        This is not the application. If a reviewer takes it further you will get a link by email to
        the full form, which asks for photographs taken at the time and a live location for your
        address.
      </p>
    </form>
  );
}
