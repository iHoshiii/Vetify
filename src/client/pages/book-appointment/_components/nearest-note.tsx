import type { MyLocationStatus } from '@/hooks/use-my-location';
import { BOOKING_NEAREST_LIMIT } from '@shared/limits';

const NOTE = 'mt-3 text-sm leading-6 text-slate-600';

// The vet is chosen before the service, so the shortlist is nearest-first across the country.
const OFFER = `Share your location and this shortlists the ${BOOKING_NEAREST_LIMIT} nearest vets taking bookings, nearest first.`;

/** One line of status for the shortlist: what it needs, what it is doing, or why it is bare. */
export default function NearestNote({
  status,
  isPending,
  count,
}: {
  status: MyLocationStatus;
  isPending: boolean;
  count: number;
}) {
  if (status === 'idle') return <p className={NOTE}>{OFFER}</p>;

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

  if (count === 0)
    return (
      <p className={NOTE}>
        No vet is taking bookings right now. Search the whole directory below instead.
      </p>
    );

  return null;
}
