// Nominatim's forward search, the mirror of the reverse lookup the picker already does.
// Queried straight from the browser like osm.service, so no apiFetch and no Vetify server.

export type FoundPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  zoom: number;
};

// One row of the answer, before anything has been assumed about it
type SearchRow = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  addresstype?: string;
};

// How close to sit on a hit: a building can be looked at, a province can only be flown over
const ZOOM_FOR: Record<string, number> = {
  building: 18,
  house: 18,
  amenity: 18,
  shop: 18,
  office: 18,
  road: 17,
  neighbourhood: 16,
  suburb: 15,
  village: 15,
  town: 14,
  city: 13,
  municipality: 13,
  province: 10,
  state: 10,
};

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  // Every applicant is licensed here, so a hit anywhere else is noise
  url.searchParams.set('countrycodes', 'ph');
  url.searchParams.set('limit', '6');

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Place search failed');
  const rows = (await response.json()) as SearchRow[];

  return rows.flatMap((row) => {
    const latitude = Number(row.lat);
    const longitude = Number(row.lon);
    if (!row.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [
      {
        id: String(row.place_id ?? `${latitude},${longitude}`),
        label: row.display_name,
        latitude,
        longitude,
        zoom: ZOOM_FOR[row.addresstype ?? ''] ?? 16,
      },
    ];
  });
}
