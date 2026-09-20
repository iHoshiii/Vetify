import type { MyLocationStatus } from '@/hooks/use-my-location';
import { BOOKING_NEAREST_LIMIT } from '@shared/limits';
import type { AppointmentKind } from '@shared/schemas';

const NOTE = 'mt-3 text-sm leading-6 text-slate-600';

/** What sharing a location buys, said in the terms of the kind already chosen. */
const OFFER: Record<AppointmentKind, string> = {
  onsite: `Share your location and this shortlists the ${BOOKING_NEAREST_LIMIT} nearest clinics registered to Vetify that are taking bookings.`,
  virtual: `Share your location and this shortlists the ${BOOKING_NEAREST_LIMIT} most experienced vets taking bookings, nearest first. A call has no distance, so this looks nationwide.`,
};

/** Why the shortlist is empty, which depends on whether a radius was doing the excluding. */
function empty(kind: AppointmentKind, radiusKm: number): string {
  return kind === 'onsite'
    ? `No clinic within ${radiusKm} km of you is taking bookings. Search the whole directory below instead.`
    : 'No vet is taking bookings right now. Search the whole directory below instead.';
}

/** One line of status for the shortlist: what it needs, what it is doing, or why it is bare. */
export default function NearestNote({
  status,
  kind,
  isPending,
  count,
  radiusKm,
}: {
  status: MyLocationStatus;
  kind: AppointmentKind;
  isPending: boolean;
  count: number;
  radiusKm: number;
}) {
  if (status === 'idle') return <p className={NOTE}>{OFFER[kind]}</p>;

  if (status === 'asking') return <p className={NOTE}>Finding where you are…</p>;

  if (status === 'denied')
    return (
      <p className={NOTE}>
        Your browser is blocking location for this site. Allow it and try again, or search the
        directory below.
      </p>
    );

  if (status === 'unsupported')
    return (
      <p className={NOTE}>This browser cannot share a location. Search the directory below.</p>
    );

  if (status === 'failed')
    return (
      <p className={NOTE}>
        Your location could not be read. Try again, or search the directory below.
      </p>
    );

  if (isPending) return <p className={NOTE}>Looking for vets near you…</p>;

  if (count === 0) return <p className={NOTE}>{empty(kind, radiusKm)}</p>;

  return null;
}
