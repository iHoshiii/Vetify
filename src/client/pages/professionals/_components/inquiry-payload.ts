import { professionalInquirySchema, type ProfessionalInquiryInput } from '@shared/schemas';

import { composeName, EMPTY_NAME, nameErrors } from './name-fields';
import type { Point } from './pin-picker';

export type Errors = Record<string, string | undefined>;
export type Pins = { current: Point | null; clinic: Point | null };

export const EMPTY_INQUIRY = {
  ...EMPTY_NAME,
  email: '',
  licenseNumber: '',
  licenseAuthority: 'Professional Regulation Commission',
  yearsExperience: '',
  clinicName: '',
  currentLocation: '',
  clinicLocation: '',
  motivation: '',
  phone: '',
};

export type InquiryValues = typeof EMPTY_INQUIRY;

/** First message per field, which is all a field can show. */
export function firstErrors(issues: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(issues).map(([field, list]) => [field, list?.[0]]));
}

// The register holds one name and one address line each, so the boxes are joined here
export function inquiryPayload(values: InquiryValues, pins: Pins): ProfessionalInquiryInput {
  return {
    name: composeName(values),
    email: values.email,
    licenseNumber: values.licenseNumber,
    licenseAuthority: values.licenseAuthority,
    yearsExperience: values.yearsExperience,
    clinicName: values.clinicName,
    currentLocation: values.currentLocation,
    clinicLocation: values.clinicLocation,
    // The coordinates behind those two lines. Sent, not just held for the marker:
    // the application is built from these and the map is drawn from them.
    currentPin: pins.current,
    clinicPin: pins.clinic,
    motivation: values.motivation,
    phone: values.phone,
  };
}

// What the send button reads, and what a submit writes under the boxes: the schema's own
// rules, the name parts it only ever sees joined, and the years box it would read '' as nought.
export function inquiryProblems(values: InquiryValues, pins: Pins): Errors {
  const parsed = professionalInquirySchema.safeParse(inquiryPayload(values, pins));
  const found: Errors = {
    yearsExperience: values.yearsExperience.trim()
      ? undefined
      : 'How many years have you practised?',
    ...(parsed.success ? {} : firstErrors(parsed.error.flatten().fieldErrors)),
    ...nameErrors(values),
  };
  return Object.fromEntries(Object.entries(found).filter(([, message]) => message));
}
