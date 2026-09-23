import { AlertTriangle } from 'lucide-react';
import type { MyLocationStatus } from '@/hooks/use-my-location';
import { Link } from 'react-router-dom';

type LocationFeedbackProps = {
  status: MyLocationStatus;
  loading: boolean;
  placesCount: number;
  bothFailed: boolean;
  radiusKm: number;
};

function DirectoryLink({ children }: { children: React.ReactNode }) {
  return (
    <Link to="/professionals" className="font-bold text-blue-700 underline hover:text-blue-800">
      {children}
    </Link>
  );
}

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
        Share your location to see nearby vets and clinics, or{' '}
        <DirectoryLink>browse the directory</DirectoryLink> without sharing it.
      </p>
    );
  }

  if (status === 'asking') {
    return <p className="text-xs font-semibold text-slate-500">Locating…</p>;
  }

  if (status === 'denied') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        Thanks for keeping your location private. You can allow access and try again, or{' '}
        <DirectoryLink>search the directory</DirectoryLink> by city.
      </p>
    );
  }

  if (status === 'unsupported') {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        This browser cannot share a location. You can still{' '}
        <DirectoryLink>search the directory</DirectoryLink> by city.
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
        <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
        <span>
          We could not get a fix from this device. Try again, or{' '}
          <DirectoryLink>search the directory</DirectoryLink> by city.
        </span>
      </p>
    );
  }

  if (status === 'ready') {
    if (loading) {
      return <p className="text-xs font-semibold text-slate-500">Looking for vets near you…</p>;
    }

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
          Nothing is listed within {radiusKm} km of you. Vetify professionals choose whether to
          appear here, and OpenStreetMap only knows the clinics somebody has added. You can also{' '}
          <DirectoryLink>search the directory</DirectoryLink> by city.
        </p>
      );
    }
  }

  return null;
}
