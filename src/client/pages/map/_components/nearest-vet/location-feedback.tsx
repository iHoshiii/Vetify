import { AlertTriangle } from 'lucide-react';
import type { MyLocationStatus } from '@/hooks/use-my-location';

type LocationFeedbackProps = {
  status: MyLocationStatus;
  loading: boolean;
  placesCount: number;
  bothFailed: boolean;
  radiusKm: number;
};

export function LocationFeedback({
  status,
  loading,
  placesCount,
  bothFailed,
  radiusKm,
}: LocationFeedbackProps) {
  if (status === 'idle') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        Share your location to know the top 5 nearest vets and clinics within your location or you
        can click the &apos;Click to Explore Map&apos; button to see all vets and clinics on the
        map.
      </p>
    );
  }

  if (status === 'asking') {
    return (
      <p className="text-xs font-semibold text-slate-500">
        Locating… please check your location permissions if error occurs.
      </p>
    );
  }

  if (status === 'denied') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        Connection denied... please allow location access in your browser`to see the nearest vets
        and clinics.
      </p>
    );
  }

  if (status === 'unsupported') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        Cannot share location... Please use the &apos;Click to Explore Map&apos; button to see all
        vets and clinics on the map.
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
        <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Connection failed... Please check your internet connection or use the &apos;Click to
          Explore Map&apos; button to see all vets and clinics on the map.
        </span>
      </p>
    );
  }

  if (status === 'ready') {
    if (loading)
      return <p className="text-xs font-semibold text-slate-500">Looking for vets near you…</p>;

    if (bothFailed) {
      return (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
          <span>We could not reach your location. Press the button to try again.</span>
        </p>
      );
    }

    if (placesCount === 0) {
      return (
        <p className="text-xs leading-relaxed text-slate-500">
          Nothing is on the map within {radiusKm} km of you. Click the &apos;Click to Explore
          Map&apos; button to see all vets and clinics on the map.
        </p>
      );
    }
  }

  return null;
}
