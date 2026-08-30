import type { NearbyPlace } from '@/components/map-prof-vet';
import { PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import { AlertTriangle, Crosshair, Loader2, MapPin } from 'lucide-react';
import type { MyLocationStatus } from '../use-my-location';

import { LocationFeedback } from './location-feedback';
import { PlacesList } from './place-list';

export type NearestVetsProps = {
  status: MyLocationStatus;
  onAsk: () => void;
  places: NearbyPlace[];
  loading: boolean;
  vetsFailed: boolean;
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
  const bothFailed = vetsFailed && clinicsFailed;
  const halfFailed = !bothFailed && (vetsFailed || clinicsFailed);

  return (
    <div className="rounded-3xl border border-blue-900/10 bg-white p-4 shadow-lg shadow-blue-900/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-black tracking-tight text-slate-900">
          <MapPin className="h-4 w-4 text-blue-600" />
          Nearest Vet From You
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
            {status === 'ready' ? 'Update' : asking ? 'Locating…' : 'Scan my location'}
          </button>
        )}
      </div>

      <div className="mt-3">
        <LocationFeedback
          status={status}
          loading={loading}
          placesCount={places.length}
          bothFailed={bothFailed}
          radiusKm={radiusKm}
        />

        <PlacesList places={places} loading={loading} />

        {status === 'ready' && !loading && halfFailed && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              {vetsFailed
                ? 'Vetify’s own vets could not be loaded just now, so this list is only the clinics from the Map.'
                : 'Map could not be reached, so this list is only Vetify’s own verified vets.'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
