import {
  findOsmClinicCache,
  replaceOsmClinicCache,
  type OsmClinic,
  type OsmClinicCacheDocument,
} from '../models/osm-clinics';
import { AppError } from '../utils/AppError';

export const OSM_CLINIC_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OVERPASS_TIMEOUT_MS = 30_000;
const CACHE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const OVERPASS_QUERY = `
[out:json][timeout:25];
(
  node["amenity"="veterinary"](4.5,116.9,21.4,126.6);
  way["amenity"="veterinary"](4.5,116.9,21.4,126.6);
  node["amenity"="animal_shelter"](4.5,116.9,21.4,126.6);
  node["shop"="veterinary"](4.5,116.9,21.4,126.6);
);
out center;
`;

const ENDPOINTS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

type Fetcher = typeof fetch;

function toClinic(element: OverpassElement): OsmClinic[] {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return [];
  }

  const tags = element.tags ?? {};
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean)
    .join(' ');
  const phone = tags.phone ?? tags['contact:phone'];

  return [
    {
      id: `${element.type ?? 'node'}/${element.id ?? `${latitude},${longitude}`}`,
      name: tags.name ?? tags['name:en'] ?? 'Unnamed Vet Clinic',
      latitude,
      longitude,
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
    },
  ];
}

export async function fetchOsmClinics(fetcher: Fetcher = fetch): Promise<OsmClinic[]> {
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
        signal: controller.signal,
      });
      if (!response.ok) continue;

      const data = (await response.json()) as { elements?: OverpassElement[] };
      return (data.elements ?? []).flatMap(toClinic);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.warn(`[osm] Overpass fetch failed for ${endpoint}: ${(error as Error).message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AppError(503, 'Clinic data is temporarily unavailable.');
}

let refreshInFlight: Promise<OsmClinicCacheDocument> | null = null;

export function refreshOsmClinicCache(fetcher: Fetcher = fetch) {
  refreshInFlight ??= fetchOsmClinics(fetcher)
    .then((clinics) => replaceOsmClinicCache(clinics))
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function getOsmClinics(options: { now?: Date; fetcher?: Fetcher } = {}) {
  const now = options.now ?? new Date();
  const cached = await findOsmClinicCache();

  if (!cached) {
    const fresh = await refreshOsmClinicCache(options.fetcher);
    return { items: fresh.clinics, refreshedAt: fresh.refreshedAt.toISOString(), stale: false };
  }

  const stale = now.getTime() - cached.refreshedAt.getTime() >= OSM_CLINIC_CACHE_TTL_MS;
  if (stale) {
    void refreshOsmClinicCache(options.fetcher).catch((error) => {
      console.warn(`[osm] background refresh failed: ${(error as Error).message}`);
    });
  }

  return { items: cached.clinics, refreshedAt: cached.refreshedAt.toISOString(), stale };
}

export function startOsmClinicRefresh(): () => void {
  const check = () => {
    void getOsmClinics().catch((error) => {
      console.warn(`[osm] cache warm-up failed: ${(error as Error).message}`);
    });
  };

  check();
  const timer = setInterval(check, CACHE_CHECK_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
