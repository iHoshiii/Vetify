import { formatDistance, type OsmClinic } from '@/components/map-prof-vet';
import { ExternalLink, MapPin, Phone } from 'lucide-react';

export function ClinicRow({
  clinic,
  distanceMeters,
}: {
  clinic: OsmClinic;
  distanceMeters: number;
}) {
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
          <span className="text-slate-400">Listed on Map · not verified by us</span>
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
            Open in Map
            <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </span>
    </li>
  );
}
