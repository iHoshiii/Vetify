import { AlertTriangle } from 'lucide-react';
import type { MyLocationStatus } from '../use-my-location';
import { DirectoryLink } from './directory-link';

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
        Share your location and we will rank every vet on the map by how far away they are —
        Vetify&apos;s verified vets and the clinics listed on OpenStreetMap alike. It is used to
        sort this list and nothing else — we do not store it. Rather not?{' '}
        <DirectoryLink>Browse the directory</DirectoryLink> by city instead.
      </p>
    );
  }

  if (status === 'asking') {
    return (
      <p className="text-xs font-semibold text-slate-500">
        Waiting for your browser… you may need to allow the prompt.
      </p>
    );
  }

  if (status === 'denied') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        No problem — your browser is keeping your location private. You can still{' '}
        <DirectoryLink>search the directory</DirectoryLink> by city and province, or allow location
        for this site in your browser&apos;s address bar and press the button again.
      </p>
    );
  }

  if (status === 'unsupported') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        This browser cannot share a location. <DirectoryLink>Search the directory</DirectoryLink> by
        city and province instead.
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
        <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Your device could not get a fix just now. Try again, or{' '}
          <DirectoryLink>search the directory</DirectoryLink> by city.
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
          <span>
            We could not reach the directory or OpenStreetMap. Press the button to try again.
          </span>
        </p>
      );
    }

    if (placesCount === 0) {
      return (
        <p className="text-xs leading-relaxed text-slate-500">
          Nothing is on the map within {radiusKm} km of you. Our vets choose whether to appear here,
          and OpenStreetMap only knows the clinics somebody has added —{' '}
          <DirectoryLink>search the directory</DirectoryLink> by city and province, which does not
          depend on either.
        </p>
      );
    }
  }

  return null;
}
