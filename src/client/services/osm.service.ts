import type { OsmClinic } from '@/components/map-prof-vet';

import { apiFetch } from './api';

/**
 * Reads the nationwide OpenStreetMap clinic dataset from Vetify's persistent cache.
 * The server owns the slow Overpass query, its mirror fallback, and refresh schedule.
 */
export async function fetchOsmClinics(signal?: AbortSignal): Promise<OsmClinic[]> {
  const response = await apiFetch<{ items: OsmClinic[] }>('/clinics', { signal });
  return response.items;
}
