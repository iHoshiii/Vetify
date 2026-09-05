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
    // The form shows a fixed +63 and keeps only what follows it
    phone: values.phone.trim() ? `+63 ${values.phone.trim()}` : '',
  };
}

// Where the two pickers sit in the form. The label depends on which rule is short
const ADDRESS_PAIR = 'addressPair';

// Form order, not the order the problems came back in, so the note reads down the page
const FIELD_LABELS: [string, string][] = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['name', 'Name'],
  ['email', 'Email address'],
  ['licenseNumber', 'License number'],
  ['licenseAuthority', 'Issuing authority'],
  ['yearsExperience', 'Years in practice'],
  ['phone', 'Contact number'],
  [ADDRESS_PAIR, ''],
  ['motivation', 'Why you want to join'],
];

// Neither address given is one complaint about the pair; a clinic named without a pin is
// only the clinic's
function addressLabel(problems: Errors): string | null {
  if (problems.currentLocation && problems.clinicLocation) return 'One address';
  if (problems.clinicLocation) return 'Your clinic on the map';
  return problems.currentLocation ? 'Your home on the map' : null;
}

export function missingLabels(problems: Errors): string[] {
  const named = FIELD_LABELS.flatMap(([field, label]) => {
    if (field === ADDRESS_PAIR) {
      const address = addressLabel(problems);
      return address ? [address] : [];
    }
    return problems[field] ? [label] : [];
  });
  return [...new Set(named)];
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
