import { formatDistance, type NearbyPlace, type OsmClinic } from '@/components/map-vets';
import type { NearbyProfessional } from '@/services/professionals.service';
import { PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import {
  AlertTriangle,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Stethoscope,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { MyLocationStatus } from './use-my-location';

/**
 * "Find a vet near you", answering the second half of its own sentence.
 *
 * This is the half of the hero a phone can see — the map column beside it is
 * `hidden lg:block` — so it has to work on its own: a button that asks for a location,
 * and then a short list of what is near it: the vets registered with Vetify first, then
 * the clinics that are only on a public map, each group nearest first. `rankNearby` makes
 * that decision and this panel obeys it — the order arrives already made.
 *
 * Both sources, though not on equal footing: Vetify's own verified vets, ranked by the
 * server, and the OpenStreetMap clinics the map has always drawn. Listing only ours would
 * have been the easier answer and the wrong one to "find a vet near you" — a stranger with
 * a sick animal wants a door they can actually get to, so the scraped ones are here too,
 * under ours and labelled for what they are. Which is why the rows read differently: one
 * has a profile, a rate and a button that books an appointment, and the other says plainly
 * that it is a listing from a public map and offers directions and nothing else.
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

/**
 * A clinic from OpenStreetMap, which is a different kind of claim and says so.
 *
 * No profile link and no booking link, because there is nothing behind them: this is a
 * name and a coordinate somebody added to a public map, and Vetify has never checked it,
 * spoken to them, or seen a licence. What it can honestly offer is directions, which is
 * why the only affordance is Maps. The blue matches the pin this same clinic has on the
 * map, so the two halves of the screen agree about which is which.
 */
function ClinicRow({ clinic, distanceMeters }: { clinic: OsmClinic; distanceMeters: number }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200 border-dashed bg-slate-50/60 p-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-2 ring-blue-100">
        <MapPin className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-slate-800">{clinic.name}</span>
          <span className="shrink-0 text-xs font-black text-slate-600">
            {formatDistance(distanceMeters)} away
          </span>
        </span>

        {clinic.address && (
          <span className="block truncate text-xs text-slate-500">{clinic.address}</span>
        )}

        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold">
          <span className="text-slate-400">Listed on OpenStreetMap · not verified by us</span>
          {clinic.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="inline-flex items-center gap-1 text-slate-600 hover:underline"
            >
              <Phone className="h-3 w-3" />
              {clinic.phone}
            </a>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
          >
            Open in Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </span>
    </li>
  );
}

export type NearestVetsProps = {
  status: MyLocationStatus;
  onAsk: () => void;
  /**
   * Both sources, already merged and sorted nearest first by `rankNearby`. Empty until a
   * location is shared, because there is nowhere to measure from until then.
   */
  places: NearbyPlace[];
  loading: boolean;
  /** Vetify's ranked query failed — a network problem rather than a refused prompt. */
  vetsFailed: boolean;
  /** Overpass failed. Its own flag, because one source being down is not both. */
  clinicsFailed: boolean;
  radiusKm?: number;
};

export default function NearestVets({
  status,
  onAsk,
  places,
  loading,
  vetsFailed,
  clinicsFailed,
  radiusKm = PROFESSIONAL_NEAR_RADIUS_KM,
}: NearestVetsProps) {
  const asking = status === 'asking' || (status === 'ready' && loading);

  /**
   * One source down is a shorter list; both down is no answer at all.
   *
   * Told apart because they fail for unrelated reasons — our API and a volunteer-run
   * Overpass mirror — and because a visitor who can see six clinics does not need a
   * warning, only a note that the list is short of one half.
   */
  const bothFailed = vetsFailed && clinicsFailed;
  const halfFailed = !bothFailed && (vetsFailed || clinicsFailed);

  return (
    <div className="rounded-3xl border border-blue-900/10 bg-white p-4 shadow-lg shadow-blue-900/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-black tracking-tight text-slate-900">
          <MapPin className="h-4 w-4 text-blue-600" />
          Nearest you
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
            Share your location and we will rank every vet on the map by how far away they are —
            Vetify&apos;s verified vets and the clinics listed on OpenStreetMap alike. It is used to
            sort this list and nothing else — we do not store it. Rather not?{' '}
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

        {status === 'ready' && !loading && bothFailed && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
            <span>
              We could not reach the directory or OpenStreetMap. Press the button to try again.
            </span>
          </p>
        )}

        {status === 'ready' && !loading && !bothFailed && places.length === 0 && (
          <p className="text-xs leading-relaxed text-slate-500">
            Nothing is on the map within {radiusKm} km of you. Our vets choose whether to appear
            here, and OpenStreetMap only knows the clinics somebody has added —{' '}
            <DirectoryLink>search the directory</DirectoryLink> by city and province, which does not
            depend on either.
          </p>
        )}

        {places.length > 0 && !loading && (
          <ul className="space-y-2">
            {places.map((place) =>
              place.source === 'vetify' ? (
                <VetRow key={place.key} vet={place.vet} />
              ) : (
                <ClinicRow
                  key={place.key}
                  clinic={place.clinic}
                  distanceMeters={place.distanceMeters}
                />
              )
            )}
          </ul>
        )}

        {/* One half missing is a short list rather than no answer, so it is a footnote
            under the rows and not a warning in place of them. */}
        {status === 'ready' && !loading && halfFailed && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              {vetsFailed
                ? 'Vetify’s own vets could not be loaded just now, so this list is only the clinics from OpenStreetMap.'
                : 'OpenStreetMap could not be reached, so this list is only Vetify’s own verified vets.'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
