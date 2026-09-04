import Button from '@/components/ui/Button';
import { useApplyThroughInvite } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { InviteSummary } from '@/services/professionals.service';
import { professionalApplySchema, type ProfessionalApplyInput } from '@shared/schemas';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import type { AddressValue } from './address-fields';
import PhotoCapture, { type Capture } from './photo-capture';

type Errors = Record<string, string | undefined>;

const REQUIRED_MESSAGES: Record<string, string> = {
  portrait: 'Take a photo of your face before submitting.',
  licenseFront: 'Take a photo of the front of your licence before submitting.',
  licenseBack: 'Take a photo of the back of your licence before submitting.',
};

/** First message per field, which is all a field can show. */
function firstErrors(issues: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(
    Object.entries(issues).map(([field, list]) => {
      const message = list?.[0];
      return [
        field,
        message === 'Invalid input: expected object, received undefined'
          ? REQUIRED_MESSAGES[field] ?? 'This field is required.'
          : message,
      ];
    })
  );
}

/** An address as the schema wants it: blank postal code dropped, fix as taken. */
function addressPayload(address: AddressValue) {
  return {
    kind: address.kind,
    line1: address.line1,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode.trim() || undefined,
    fix: address.fix,
    mapPin: address.mapPin,
  };
}

function reviewedAddress(
  kind: AddressValue['kind'],
  location: string,
  pin: { latitude: number; longitude: number } | null
): AddressValue {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const city = parts.length > 1 ? parts[parts.length - 2] : location;
  const province = parts.length > 1 ? parts[parts.length - 1] : location;
  const line1 = parts.length > 2 ? parts.slice(0, -2).join(', ') : location;
  return { kind, line1, city, province, postalCode: '', fix: null, mapPin: pin };
}

// The clinic is only included when it has a name, because the apply schema refuses a
// clinic address that cannot be named and an invisible refusal is a dead submit button.
function reviewedAddresses(invite: InviteSummary): AddressValue[] {
  const home = invite.currentLocation?.trim();
  const clinic = invite.clinicLocation?.trim();
  const reviewed: AddressValue[] = [];
  // Either one may be missing, because the enquiry only asked for one of the two
  if (home) reviewed.push(reviewedAddress('home', home, invite.currentPin));
  if (clinic && invite.clinicName?.trim()) {
    reviewed.push(reviewedAddress('clinic', clinic, invite.clinicPin));
  }
  return reviewed;
}

// Deduplicated: a one-part location lands in line1, city and province all at once.
function addressLine(address: AddressValue) {
  return [...new Set([address.line1, address.city, address.province])].filter(Boolean).join(', ');
}

type Props = { token: string; invite: InviteSummary };

/**
 * Stage two: the application itself, behind the emailed link.
 *
 * The three identity fields are shown and not editable. They came from the enquiry
 * a reviewer read and approved, and letting them be changed here would mean the
 * name on the application was never the name anybody agreed to invite — so the
 * form says to write in instead.
 *
 * Everything else is filled in once and then frozen: the dashboard renders it
 * read-only afterwards, because the licence has been checked against a register
 * and the photographs against a face.
 */
export default function InvitedApplyForm({ token, invite }: Props) {
  const [addresses] = useState<AddressValue[]>(() => reviewedAddresses(invite));
  const [portrait, setPortrait] = useState<Capture | null>(null);
  const [licenseFront, setLicenseFront] = useState<Capture | null>(null);
  const [licenseBack, setLicenseBack] = useState<Capture | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');

  const apply = useApplyThroughInvite(token);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage('');

    if (!consent) {
      setErrors({ backgroundCheckConsent: 'Consent to a background check is required' });
      setMessage('Please confirm the background-check consent before submitting.');
      return;
    }

    const payload = {
      // Sent rather than trusted from the token alone: the schema wants the name on
      // the application, and this is the one the reviewer saw.
      fullName: invite.name,
      licenseNumber: invite.licenseNumber,
      licenseAuthority: invite.licenseAuthority ?? 'Professional Regulation Commission',
      clinicName: invite.clinicName ?? undefined,
      businessPhone: invite.phone ?? undefined,
      addresses: addresses.map(addressPayload),
      portrait: portrait ?? undefined,
      licenseFront: licenseFront ?? undefined,
      licenseBack: licenseBack ?? undefined,
      yearsExperience: invite.yearsExperience ?? 0,
      backgroundCheckConsent: consent,
    } as ProfessionalApplyInput;

    const parsed = professionalApplySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      setMessage('Please correct the highlighted fields.');
      return;
    }

    apply.mutate(payload, {
      onError: (err) => {
        setMessage(err.message);
        if (err instanceof ApiError && err.issues) setErrors(firstErrors(err.issues));
      },
    });
  }

  const mandatoryFieldsFilled =
    consent &&
    Boolean(portrait && licenseFront && licenseBack) &&
    Boolean(invite.licenseAuthority?.trim() || 'Professional Regulation Commission') &&
    Number.isInteger(invite.yearsExperience ?? 0) &&
    (invite.yearsExperience ?? 0) >= 0 &&
    (invite.yearsExperience ?? 0) <= 70 &&
    addresses.length > 0 &&
    addresses.every(
      (address) =>
        address.line1.trim().length >= 6 &&
        address.city.trim().length >= 2 &&
        address.province.trim().length >= 2 &&
        (address.kind !== 'clinic' || Boolean(invite.clinicName?.trim()))
    );

  // Named in page order, so what is left to do reads down the form
  const outstanding = [
    [Boolean(portrait), 'a photo of your face'],
    [Boolean(licenseFront), 'the front of your licence'],
    [Boolean(licenseBack), 'the back of your licence'],
    [consent, 'the consent box'],
  ] as const;
  const missing = outstanding.filter(([done]) => !done).map(([, label]) => label);

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
      {message && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {message}
        </div>
      )}

      <section className="rounded-xl border border-teal-900/10 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-800">
          Reviewed details
        </p>
        <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">From your enquiry</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          These three are the ones a reviewer approved, so they are fixed here. The name has to
          match the one on your PRC licence. If one information is incorrect please{' '}
          {/* A new tab, because leaving this page loses the photographs already taken */}
          <Link
            to="/contact"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-teal-800 underline"
          >
            contact us
          </Link>
          .
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">Name</dt>
            <dd className="font-bold text-slate-900">{invite.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">License number</dt>
            <dd className="font-bold text-slate-900">{invite.licenseNumber}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="font-bold text-slate-900">{invite.email}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-800">
            Verification photos
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Photographs, taken now
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            All three are taken through the camera on this device. There is no way to choose a file:
            the point is a picture of you and of the card in your hand, today.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PhotoCapture
            label="Your face"
            hint="Look straight at the camera, somewhere with even light."
            facing="user"
            value={portrait}
            onChange={setPortrait}
            error={errors.portrait}
          />
          <PhotoCapture
            label="PRC licence, front"
            hint="Fill the frame with the card. The licence number has to be readable."
            facing="environment"
            value={licenseFront}
            onChange={setLicenseFront}
            error={errors.licenseFront}
          />
          <PhotoCapture
            label="PRC licence, back"
            hint="The same card, turned over."
            facing="environment"
            value={licenseBack}
            onChange={setLicenseBack}
            error={errors.licenseBack}
          />
        </div>
      </section>

      <section className="rounded-xl border border-teal-900/10 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-800">
          Reviewed locations
        </p>
        <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">Where you are</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          These are the markers you dropped on your enquiry. Once you are verified they are what pet
          owners are shown on the map. They cannot be changed here — write to
          support.vetify@gmail.com if one of them is wrong.
        </p>

        <ul className="mt-3 space-y-2">
          {addresses.map((address) => (
            <li key={address.kind} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                {address.kind === 'home' ? 'Home' : 'Clinic'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">{addressLine(address)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {address.mapPin
                  ? `Pinned at ${address.mapPin.latitude.toFixed(
                      5
                    )}, ${address.mapPin.longitude.toFixed(5)}`
                  : 'No marker was dropped for this one, so it will not appear on the map.'}
              </p>
            </li>
          ))}
        </ul>

        {errors.addresses && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600">
            {errors.addresses}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-950">Before you submit</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Anything still marked <span className="font-bold text-red-500">*</span> is outstanding.
            The button activates when the application is ready.
          </p>
        </div>

        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
            aria-invalid={Boolean(errors.backgroundCheckConsent)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
          />
          <span>
            {!consent && (
              <span aria-hidden className="mr-1 font-bold text-red-500">
                *
              </span>
            )}
            I consent to a professional background check, and confirm the licence photographed above
            is current and mine.
            {errors.backgroundCheckConsent && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                {errors.backgroundCheckConsent}
              </span>
            )}
          </span>
        </label>
      </section>

      <div className="space-y-3">
        <Button
          type="submit"
          size="lg"
          loading={apply.isPending}
          disabled={!mandatoryFieldsFilled}
          className="w-full rounded-xl bg-slate-950 shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:bg-slate-300 sm:w-auto"
        >
          {apply.isPending ? 'Submitting' : 'Submit application'}
        </Button>
        {missing.length > 0 && (
          <p className="text-xs text-slate-500">Still to do: {missing.join(', ')}.</p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Once this is in, none of it can be edited from your dashboard — an application is checked
          as it was filed. After this comes the interview, and after that the decision.
        </p>
      </div>
    </form>
  );
}
