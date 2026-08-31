import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useApplyThroughInvite } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { InviteSummary } from '@/services/professionals.service';
import { professionalApplySchema, type ProfessionalApplyInput } from '@shared/schemas';
import { useState, type FormEvent } from 'react';

import type { AddressValue } from './address-fields';
import PhotoCapture, { type Capture } from './photo-capture';

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

type Errors = Record<string, string | undefined>;

const REQUIRED_MESSAGES: Record<string, string> = {
  portrait: 'Take a photo of your face before submitting.',
  licenseFront: 'Take a photo of the front of your licence before submitting.',
  licenseBack: 'Take a photo of the back of your licence before submitting.',
};

const EMPTY = {
  licenseAuthority: 'Professional Regulation Commission',
  clinicName: '',
  businessPhone: '',
  yearsExperience: '',
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
  };
}

function reviewedAddress(location: string): AddressValue {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const city = parts.length > 1 ? parts[parts.length - 2] : location;
  const province = parts.length > 1 ? parts[parts.length - 1] : location;
  const line1 = parts.length > 2 ? parts.slice(0, -2).join(', ') : location;
  return { kind: 'home', line1, city, province, postalCode: '', fix: null };
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
  const [values, setValues] = useState(EMPTY);
  const [addresses] = useState<AddressValue[]>([reviewedAddress(invite.currentLocation)]);
  const [portrait, setPortrait] = useState<Capture | null>(null);
  const [licenseFront, setLicenseFront] = useState<Capture | null>(null);
  const [licenseBack, setLicenseBack] = useState<Capture | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');

  const apply = useApplyThroughInvite(token);

  function set(field: keyof typeof EMPTY) {
    return (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

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
      licenseAuthority: values.licenseAuthority,
      clinicName: values.clinicName.trim() || undefined,
      businessPhone: values.businessPhone,
      addresses: addresses.map(addressPayload),
      portrait: portrait ?? undefined,
      licenseFront: licenseFront ?? undefined,
      licenseBack: licenseBack ?? undefined,
      yearsExperience: values.yearsExperience,
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
    values.licenseAuthority.trim().length > 0 &&
    values.yearsExperience.trim().length > 0 &&
    Number.isInteger(Number(values.yearsExperience)) &&
    Number(values.yearsExperience) >= 0 &&
    Number(values.yearsExperience) <= 70 &&
    addresses.length > 0 &&
    addresses.every(
      (address) =>
        address.line1.trim().length >= 6 &&
        address.city.trim().length >= 2 &&
        address.province.trim().length >= 2 &&
        (address.kind !== 'clinic' || values.clinicName.trim().length >= 2)
    );

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

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-bold text-slate-900">From your enquiry</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          These three are the ones a reviewer approved, so they are fixed here. The name has to
          match the one on your PRC licence — if it does not, write to us rather than filing this.
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

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black tracking-tight">Photographs, taken now</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            All three are taken through the camera on this device. There is no way to choose a file:
            the point is a picture of you and of the card in your hand, today.
          </p>
        </div>

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
      </section>

      <section className="hidden">
        <div>
          <h2 className="text-lg font-black tracking-tight">Where you are</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            One address is enough — your home or your clinic. Give both if you practise somewhere
            other than where you live.
          </p>
          {errors.addresses && (
            <p className="mt-2 text-xs font-medium text-red-600">{errors.addresses}</p>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-black tracking-tight">Your practice</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            What pet owners are shown, and what a reviewer checks against the register.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Issuing authority"
            value={values.licenseAuthority}
            onChange={set('licenseAuthority')}
            error={errors.licenseAuthority}
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
          <Input
            label="Clinic name"
            value={values.clinicName}
            onChange={set('clinicName')}
            error={errors.clinicName}
            placeholder="Bayside Animal Clinic"
          />
          <Input
            label="Business contact number (optional)"
            value={values.businessPhone}
            onChange={set('businessPhone')}
            error={errors.businessPhone}
            placeholder="+63 32 555 0101"
          />
        </div>
      </section>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          aria-invalid={Boolean(errors.backgroundCheckConsent)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          I consent to a professional background check, and confirm the licence photographed above
          is current and mine.
          {errors.backgroundCheckConsent && (
            <span className="mt-1 block text-xs font-medium text-red-500">
              {errors.backgroundCheckConsent}
            </span>
          )}
        </span>
      </label>

      <div className="space-y-3">
        <Button type="submit" size="lg" loading={apply.isPending} disabled={!mandatoryFieldsFilled}>
          {apply.isPending ? 'Submitting' : 'Submit application'}
        </Button>
        <p className="text-xs leading-5 text-slate-500">
          Once this is in, none of it can be edited from your dashboard — an application is checked
          as it was filed. After this comes the interview, and after that the decision.
        </p>
      </div>
    </form>
  );
}
