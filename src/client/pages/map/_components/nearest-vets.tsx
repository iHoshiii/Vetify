import { formatDistance } from '@/components/map-vets';
import type { NearbyProfessional } from '@/services/professionals.service';
import { PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import { AlertTriangle, Crosshair, Loader2, MapPin, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { MyLocationStatus } from './use-my-location';

/**
 * "Find a vet near you", answering the second half of its own sentence.
 *
 * This is the half of the hero a phone can see — the map column beside it is
 * `hidden lg:block` — so it has to work on its own: a button that asks for a location,
 * and then the verified vets nearest it, nearest first.
 *
 * Most of what follows is the refusals. Asking for somebody's location opens a browser
 * prompt, and the majority of the answers to a prompt are not "yes": they can decline,
 * the device can fail to get a fix, the browser may not have geolocation at all, and
 * there may simply be no vet pinned within the radius. Each of those gets a sentence
 * and a way onward, because "Use my location" that leads to a blank panel is worse than
 * no button. Every one of them points at the directory, which searches by city and
 * province and needs no permission at all.
 */

const AVAILABILITY: Record<NearbyProfessional['availabilityStatus'], string> = {
  available: 'Taking bookings',
  busy: 'Booked up',
  unavailable: 'Not taking bookings',
};

const AVAILABILITY_TONE: Record<NearbyProfessional['availabilityStatus'], string> = {
  available: 'text-emerald-700',
  busy: 'text-amber-700',
  unavailable: 'text-slate-500',
};

/** The directory, which answers the same question without a permission prompt. */
function DirectoryLink({ children }: { children: React.ReactNode }) {
  return (
    <Link to="/professionals" className="font-bold text-blue-700 underline hover:text-blue-900">
      {children}
    </Link>
  );
}

function VetRow({ vet }: { vet: NearbyProfessional }) {
  const name = vet.name ?? vet.clinicName ?? 'A verified vet';
  const distance = formatDistance(vet.distanceMeters);

  return (
    <li>
      <Link
        to={`/professionals/${vet.id}`}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
      >
        {vet.avatarUrl ? (
          <img
            src={vet.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-blue-100"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-2 ring-teal-100">
            <Stethoscope className="h-5 w-5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{name}</span>
            <span className="shrink-0 text-xs font-black text-blue-700">{distance} away</span>
          </span>
          <span className="block truncate text-xs text-slate-500">
            {vet.specialties.slice(0, 2).join(' · ') || 'General practice'}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={AVAILABILITY_TONE[vet.availabilityStatus]}>
              {AVAILABILITY[vet.availabilityStatus]}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">₱{vet.hourlyRate} an hour</span>
          </span>
        </span>
      </Link>

      {vet.availabilityStatus === 'available' && (
        <Link
          to={`/book-appointment?professional=${vet.id}`}
          className="mt-1 ml-14 inline-block text-[11px] font-bold text-teal-800 hover:underline"
        >
          Book with {name.split(' ')[0]} →
        </Link>
      )}
    </li>
  );
}

export type NearestVetsProps = {
  status: MyLocationStatus;
  onAsk: () => void;
  /** Nearest first, as the server ranked them. Empty until a location is shared. */
  vets: NearbyProfessional[];
  loading: boolean;
  /** The query failed — a network problem rather than a refused prompt. */
  failed: boolean;
  radiusKm?: number;
};

export default function NearestVets({
  status,
  onAsk,
  vets,
  loading,
  failed,
  radiusKm = PROFESSIONAL_NEAR_RADIUS_KM,
}: NearestVetsProps) {
  const asking = status === 'asking' || (status === 'ready' && loading);

  return (
    <div className="rounded-3xl border border-blue-900/10 bg-white p-4 shadow-lg shadow-blue-900/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-black tracking-tight text-slate-900">
          <MapPin className="h-4 w-4 text-blue-600" />
          Vets nearest you
        </h2>

        {status !== 'unsupported' && (
          <button
            type="button"
            onClick={onAsk}
            disabled={asking}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {asking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            {status === 'ready' ? 'Update' : asking ? 'Locating…' : 'Use my location'}
          </button>
        )}
      </div>

      <div className="mt-3">
        {status === 'idle' && (
          <p className="text-xs leading-relaxed text-slate-500">
            Share your location and we will rank Vetify&apos;s verified vets by how far away they
            are. It is used to sort this list and nothing else — we do not store it. Rather not?{' '}
            <DirectoryLink>Browse the directory</DirectoryLink> by city instead.
          </p>
        )}

        {status === 'asking' && (
          <p className="text-xs font-semibold text-slate-500">
            Waiting for your browser… you may need to allow the prompt.
          </p>
        )}

        {status === 'denied' && (
          <p className="text-xs leading-relaxed text-slate-500">
            No problem — your browser is keeping your location private. You can still{' '}
            <DirectoryLink>search the directory</DirectoryLink> by city and province, or allow
            location for this site in your browser&apos;s address bar and press the button again.
          </p>
        )}

        {status === 'unsupported' && (
          <p className="text-xs leading-relaxed text-slate-500">
            This browser cannot share a location.{' '}
            <DirectoryLink>Search the directory</DirectoryLink> by city and province instead.
          </p>
        )}

        {status === 'failed' && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Your device could not get a fix just now. Try again, or{' '}
              <DirectoryLink>search the directory</DirectoryLink> by city.
            </span>
          </p>
        )}

        {status === 'ready' && loading && (
          <p className="text-xs font-semibold text-slate-500">Looking for vets near you…</p>
        )}

        {status === 'ready' && !loading && failed && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
            <span>We could not reach the directory. Press the button to try again.</span>
          </p>
        )}

        {status === 'ready' && !loading && !failed && vets.length === 0 && (
          <p className="text-xs leading-relaxed text-slate-500">
            No Vetify vet has pinned a location within {radiusKm} km of you yet. Our vets choose
            whether to appear on the map, so there may well be one nearby who has not —{' '}
            <DirectoryLink>search the directory</DirectoryLink> by city and province.
          </p>
        )}

        {vets.length > 0 && !loading && (
          <ul className="space-y-2">
            {vets.map((vet) => (
              <VetRow key={vet.id} vet={vet} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
