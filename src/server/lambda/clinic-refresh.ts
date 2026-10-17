import { initializeLambda } from './runtime';
import { findOsmClinicCache } from '../models/osm-clinics';
import { OSM_CLINIC_CACHE_TTL_MS, refreshOsmClinicCache } from '../services/osm-clinics.service';

export async function handler(
  _event: unknown,
  context: { callbackWaitsForEmptyEventLoop: boolean }
) {
  context.callbackWaitsForEmptyEventLoop = false;
  await initializeLambda();
  const cached = await findOsmClinicCache();
  if (cached && Date.now() - cached.refreshedAt.getTime() < OSM_CLINIC_CACHE_TTL_MS) return;
  await refreshOsmClinicCache();
}
