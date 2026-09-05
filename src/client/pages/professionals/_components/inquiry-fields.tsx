import Input from '@/components/ui/Input';
import { PROFESSIONAL_MOTIVATION_MAX, PROFESSIONAL_MOTIVATION_MIN } from '@shared/limits';

import type { Errors, InquiryValues, Pins } from './inquiry-payload';
import LocationPickerField, { type PickedAddress } from './location-picker-field';
import NameFields from './name-fields';
import PhoneField from './phone-field';
import type { Point } from './pin-picker';

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

type Props = {
  values: InquiryValues;
  errors: Errors;
  onChange: (field: keyof InquiryValues) => (event: { target: { value: string } }) => void;
  pins: Pins;
  onLocation: (
    field: 'currentLocation' | 'clinicLocation',
    pinField: 'current' | 'clinic'
  ) => (point: Point, address: PickedAddress) => void;
};

// Every box on the enquiry. The form around it keeps the state and does the sending
export default function InquiryFields({ values, errors, onChange, pins, onLocation }: Props) {
  const motivationLeft = PROFESSIONAL_MOTIVATION_MIN - values.motivation.trim().length;
  // Either line satisfies the pair, so the star clears as soon as one of them is in
  const addressAsking = !values.currentLocation && !values.clinicLocation;
  // A named clinic is somewhere owners get sent, so naming one leaves its pin outstanding
  const clinicAsking = Boolean(values.clinicName.trim()) && !values.clinicLocation;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <NameFields values={values} errors={errors} onChange={onChange} />
        <Input
          label="Email address"
          type="email"
          value={values.email}
          onChange={onChange('email')}
          error={errors.email}
          placeholder="you@clinic.ph"
          required
        />
        <Input
          label="License number"
          value={values.licenseNumber}
          onChange={onChange('licenseNumber')}
          error={errors.licenseNumber}
          placeholder="VET 1234-PH"
          required
        />
        <Input
          label="Issuing authority"
          value={values.licenseAuthority}
          onChange={onChange('licenseAuthority')}
          error={errors.licenseAuthority}
          required
        />
        <Input
          label="Years of experience"
          type="number"
          min={0}
          max={70}
          value={values.yearsExperience}
          onChange={onChange('yearsExperience')}
          error={errors.yearsExperience}
          required
        />
        <Input
          label="Clinic name"
          value={values.clinicName}
          onChange={onChange('clinicName')}
          error={errors.clinicName}
          placeholder="Bayside Animal Clinic"
        />
        <PhoneField value={values.phone} onChange={onChange('phone')} error={errors.phone} />
        <p className="text-sm font-medium text-slate-600 sm:col-span-2">
          One address is needed to continue. Fill in both if both exist.
          {addressAsking && (
            <span aria-hidden className="ml-1 font-bold text-red-500">
              *
            </span>
          )}
        </p>
        <div className="space-y-2">
          <LocationPickerField
            label="Your Home Address"
            kind="home"
            value={pins.current}
            address={values.currentLocation}
            onChange={onLocation('currentLocation', 'current')}
          />
          {values.currentLocation && (
            <p className="text-xs text-slate-500">{values.currentLocation}</p>
          )}
          {errors.currentLocation && (
            <p className="text-xs font-medium text-red-500">{errors.currentLocation}</p>
          )}
        </div>
        <div className="space-y-2">
          <LocationPickerField
            label="Location of your Clinic"
            kind="clinic"
            asking={clinicAsking}
            value={pins.clinic}
            address={values.clinicLocation}
            onChange={onLocation('clinicLocation', 'clinic')}
          />
          {values.clinicLocation && (
            <p className="text-xs text-slate-500">{values.clinicLocation}</p>
          )}
          {errors.clinicLocation && (
            <p className="text-xs font-medium text-red-500">{errors.clinicLocation}</p>
          )}
        </div>
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
          onChange={onChange('motivation')}
          className={FIELD}
          placeholder="Reason why you want to join our team."
          required
        />
        <p className="text-xs text-slate-500">
          {motivationLeft > 0
            ? `${motivationLeft} more characters. We would like to know your reason.`
            : `${values.motivation.trim().length} of ${PROFESSIONAL_MOTIVATION_MAX} characters.`}
        </p>
        {errors.motivation && (
          <p className="text-xs font-medium text-red-500">{errors.motivation}</p>
        )}
      </div>
    </>
  );
}
