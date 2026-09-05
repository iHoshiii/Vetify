import { useAuth } from '@/components/providers/AuthProvider';
import Button from '@/components/ui/Button';
import { useSendInquiry } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import { useState, type FormEvent } from 'react';

import ConfirmInquiryDialog from './confirm-inquiry-dialog';
import InquiryFields from './inquiry-fields';
import {
  EMPTY_INQUIRY,
  firstErrors,
  inquiryPayload,
  inquiryProblems,
  missingLabels,
  type Errors,
  type Pins,
} from './inquiry-payload';
import type { PickedAddress } from './location-picker-field';
import { composeName } from './name-fields';
import type { Point } from './pin-picker';

// Stage one: the short form that opens a review.

export default function InquiryForm() {
  const { user } = useAuth();

  const [values, setValues] = useState(() => ({ ...EMPTY_INQUIRY, email: user?.email ?? '' }));
  const [pins, setPins] = useState<Pins>({ current: null, clinic: null });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const send = useSendInquiry();
  // Read on every keystroke, because the send button is only live while this is empty
  const problems = inquiryProblems(values, pins);

  function set(field: keyof typeof EMPTY_INQUIRY) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function setLocation(
    field: 'currentLocation' | 'clinicLocation',
    pinField: 'current' | 'clinic'
  ) {
    return (point: Point, address: PickedAddress) => {
      setPins((current) => ({ ...current, [pinField]: point }));
      const parts = [address.line1, address.city, address.province, address.postalCode].filter(
        Boolean
      );
      const unique = parts.filter((part, index) => parts.indexOf(part) === index);
      setValues((current) => ({ ...current, [field]: unique.join(', ') }));
    };
  }

  // Submitting only opens the summary: the enquiry goes out from the dialog's Continue
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (Object.keys(problems).length) {
      setErrors(problems);
      setMessage('Please correct the highlighted fields.');
      return;
    }

    setErrors({});
    setConfirming(true);
  }

  function sendNow() {
    setConfirming(false);
    send.mutate(inquiryPayload(values, pins), {
      onError: (err) => {
        setMessage(err.message);
        if (err instanceof ApiError && err.issues) setErrors(firstErrors(err.issues));
      },
    });
  }

  if (send.isSuccess) {
    return (
      <div className="mt-10 rounded-lg border border-teal-900/15 bg-teal-50/70 p-6">
        <h2 className="text-lg font-black tracking-tight">Thank you! Your request is with us.</h2>
        <p className="mt-2 leading-7 text-slate-700">
          A reviewer reads every enquiry. If yours goes through, you will get an email with a link
          to the full application. It asks for your photographs, your licence card and your address.
          Watch the inbox for <strong>{values.email.trim().toLowerCase()}</strong>.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Nothing else is needed from you in the meantime. Please watch your email for updates.
        </p>
      </div>
    );
  }

  const incomplete = Object.keys(problems).length > 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        {message && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
          >
            {message}
          </div>
        )}

        <InquiryFields
          values={values}
          errors={errors}
          onChange={set}
          pins={pins}
          onLocation={setLocation}
        />

        <div className="space-y-2">
          <Button type="submit" size="lg" loading={send.isPending} disabled={incomplete}>
            {send.isPending ? 'Sending' : 'Send enquiry'}
          </Button>
          {incomplete && (
            <p className="text-xs text-slate-500">
              Still to fill in: {missingLabels(problems).join(', ')}.
            </p>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500">
          This is not the application. If a reviewer takes it further you will get a link by email
          to the full form, which asks for photographs taken at the time and a live location for
          your address. That link only opens for the account signed in with the address above.
        </p>
      </form>

      <ConfirmInquiryDialog
        open={confirming}
        name={composeName(values)}
        home={values.currentLocation}
        clinic={values.clinicLocation}
        onBack={() => setConfirming(false)}
        onContinue={sendNow}
      />
    </>
  );
}
