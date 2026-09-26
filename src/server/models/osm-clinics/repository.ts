import type { Collection } from 'mongodb';

import { getDb } from '../../config/db';
import type { OsmClinic, OsmClinicCacheDocument } from './types';

export const OSM_CLINIC_CACHE_COLLECTION = 'osmClinicCache';
const CACHE_ID = 'philippines' as const;

export function osmClinicCacheCollection(): Collection<OsmClinicCacheDocument> {
  return getDb().collection<OsmClinicCacheDocument>(OSM_CLINIC_CACHE_COLLECTION);
}

export async function findOsmClinicCache(): Promise<OsmClinicCacheDocument | null> {
  return await osmClinicCacheCollection().findOne({ _id: CACHE_ID });
}

export async function replaceOsmClinicCache(
  clinics: OsmClinic[],
  refreshedAt = new Date()
): Promise<OsmClinicCacheDocument> {
  const cache: OsmClinicCacheDocument = { _id: CACHE_ID, clinics, refreshedAt };
  await osmClinicCacheCollection().replaceOne({ _id: CACHE_ID }, cache, { upsert: true });
  return cache;
}
