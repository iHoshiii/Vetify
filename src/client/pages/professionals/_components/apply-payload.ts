import type { InviteSummary } from '@/services/professionals.service';

import type { AddressValue } from './address-fields';
import type { Capture } from './photo-capture';

export type Errors = Record<string, string | undefined>;

const REQUIRED_MESSAGES: Record<string, string> = {
  portrait: 'Take a photo of your face before submitting.',
  licenseFront: 'Take a photo of the front of your licence before submitting.',
  licenseBack: 'Take a photo of the back of your licence before submitting.',
};

// First message per field, which is all a field can show
export function firstErrors(issues: Record<string, string[] | undefined>): Errors {
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

// An address as the schema wants it: blank postal code dropped, fix as taken
export function addressPayload(address: AddressValue) {
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
export function reviewedAddresses(invite: InviteSummary): AddressValue[] {
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

export type Photos = {
  portrait: Capture | null;
  licenseFront: Capture | null;
  licenseBack: Capture | null;
};

// Named in page order, so what is left to do reads down the form
export function stillToDo(photos: Photos, consent: boolean): string[] {
  return [
    [Boolean(photos.portrait), 'a photo of your face'],
    [Boolean(photos.licenseFront), 'the front of your licence'],
    [Boolean(photos.licenseBack), 'the back of your licence'],
    [consent, 'the consent box'],
  ]
    .filter(([done]) => !done)
    .map(([, label]) => label as string);
}

// What the schema will accept, checked here so the button can say so before it is pressed
export function readyToSubmit(
  invite: InviteSummary,
  addresses: AddressValue[],
  photos: Photos,
  consent: boolean
): boolean {
  const years = invite.yearsExperience ?? 0;
  return (
    consent &&
    !stillToDo(photos, consent).length &&
    Number.isInteger(years) &&
    years >= 0 &&
    years <= 70 &&
    addresses.length > 0 &&
    addresses.every(
      (address) =>
        address.line1.trim().length >= 6 &&
        address.city.trim().length >= 2 &&
        address.province.trim().length >= 2 &&
        (address.kind !== 'clinic' || Boolean(invite.clinicName?.trim()))
    )
  );
}
