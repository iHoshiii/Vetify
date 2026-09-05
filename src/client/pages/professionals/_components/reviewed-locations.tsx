import type { AddressValue } from './address-fields';
import ApplyStep from './apply-step';

type Props = { addresses: AddressValue[]; error?: string };

// Deduplicated: a one-part location lands in line1, city and province all at once
function addressLine(address: AddressValue) {
  return [...new Set([address.line1, address.city, address.province])].filter(Boolean).join(', ');
}

const NOTE =
  'These are the markers you dropped on your enquiry. If you want to change this, please contact us.';

export default function ReviewedLocations({ addresses, error }: Props) {
  return (
    <ApplyStep step={3} title="Addresses" note={NOTE}>
      {/* Two sit side by side, one takes the width rather than leaving half the row empty */}
      <ul className={addresses.length > 1 ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
        {addresses.map((address) => (
          <li key={address.kind} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              {address.kind === 'home' ? 'Home' : 'Clinic'}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{addressLine(address)}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {address.mapPin
                ? `Pinned at ${address.mapPin.latitude.toFixed(
                    5
                  )}, ${address.mapPin.longitude.toFixed(5)}`
                : 'No marker was dropped for this one, so it will not appear on the map.'}
            </p>
          </li>
        ))}
      </ul>

      {!addresses.length && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Your enquiry has no location on it, so there is nothing to confirm here. Write to
          support.vetify@gmail.com before you fill the rest of this in.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </ApplyStep>
  );
}
