import type { OsmClinic } from '@/components/map-prof-vet';

/**
 * Veterinary clinics as OpenStreetMap has them, for the whole of the Philippines.
 *
 * A service rather than lines inside `VetMap`, because two things now need this answer
 * and they are not in the same subtree: the map draws the clinics, and the "nearest you"
 * panel beside it ranks them against Vetify's own vets. While the fetch lived in the map
 * component it went into private state and reached nobody — one query, cached once, now
 * serves both.
 *
 * There is no Vetify server in this path. Overpass is queried straight from the browser,
 * which is how it was already being done, and is why this file talks to `fetch` rather
 * than to `apiFetch`.
 */

/**
 * Every kind of node worth a paw pin, over a bounding box that is the whole country.
 *
 * `out center;` rather than `out;` so a clinic mapped as a building outline reports one
 * coordinate instead of its corner nodes. `way` has no `shop=veterinary` or
 * `amenity=animal_shelter` line because the tags are overwhelmingly on nodes and each
 * extra clause costs Overpass time on a query that already scans a country.
 */
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

/**
 * The public mirrors, tried in order.
 *
 * They rate-limit and they go down, independently, which is why there are three. This is
 * also the reason the query around this has `retry: false`: the fallback *is* the retry,
 * and TanStack repeating it would mean nine requests to a volunteer-run service.
 */
const ENDPOINTS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** One Overpass element, before anything has been assumed about it. */
type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

/**
 * An element to a clinic, or nothing.
 *
 * Nothing when there is no coordinate — a `way` whose `center` Overpass declined to
 * compute cannot be placed on a map or measured a distance to, and a row that says
 * "somewhere" is worse than one fewer row.
 */
function toClinic(element: OverpassElement): OsmClinic[] {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return [];

  const tags = element.tags ?? {};

  return [
    {
      // Qualified by type, because OSM numbers nodes and ways separately: node 42 and
      // way 42 both exist, and these ids are React keys.
      id: `${element.type ?? 'node'}/${element.id ?? `${latitude},${longitude}`}`,
      name: tags.name ?? tags['name:en'] ?? 'Unnamed Vet Clinic',
      latitude,
      longitude,
      address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
        .filter(Boolean)
        .join(' '),
      ...(tags.phone || tags['contact:phone']
        ? { phone: tags.phone ?? tags['contact:phone'] }
        : {}),
      ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
    },
  ];
}

/**
 * Ask the first mirror that answers.
 *
 * Throws when none of them do, so the caller's query lands in `isError` and the panel and
 * the map can both say so. A mirror that answers with a non-2xx is a failure like any
 * other and moves on to the next.
 */
export async function fetchOsmClinics(signal?: AbortSignal): Promise<OsmClinic[]> {
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
        signal,
      });
      if (!res.ok) continue;

      const data = (await res.json()) as { elements?: OverpassElement[] };
      return (data.elements ?? []).flatMap(toClinic);
    } catch (error) {
      // A cancelled query is not a broken mirror — the caller went away, so stop.
      if (signal?.aborted) throw error;
      console.warn(`Overpass fetch failed for ${endpoint}`, error);
    }
  }

  throw new Error('All Overpass API endpoints failed');
}
