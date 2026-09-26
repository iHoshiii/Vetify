import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { findOsmClinicCache, replaceOsmClinicCache } from '../../models/osm-clinics';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  getOsmClinics,
  OSM_CLINIC_CACHE_TTL_MS,
  refreshOsmClinicCache,
} from '../osm-clinics.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

function overpass(elements: unknown[], status = 200) {
  return new Response(JSON.stringify({ elements }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('the OpenStreetMap clinic cache', () => {
  it('fills an empty cache through the mirror fallback and reuses it', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(overpass([], 503))
      .mockResolvedValueOnce(
        overpass([
          {
            type: 'node',
            id: 42,
            lat: 14.6,
            lon: 121.05,
            tags: { name: 'Mabuhay Animal Clinic', phone: '+63 2 555 0101' },
          },
          {
            type: 'way',
            id: 7,
            center: { lat: 10.31, lon: 123.89 },
            tags: { 'name:en': 'Cebu Veterinary Centre', 'addr:city': 'Cebu City' },
          },
          { type: 'node', id: 99, tags: { name: 'Nowhere Clinic' } },
        ])
      ) as unknown as typeof fetch;

    const first = await getOsmClinics({ fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(first).toMatchObject({ stale: false });
    expect(first.items).toEqual([
      expect.objectContaining({ id: 'node/42', name: 'Mabuhay Animal Clinic' }),
      expect.objectContaining({ id: 'way/7', name: 'Cebu Veterinary Centre' }),
    ]);

    const second = await getOsmClinics({ fetcher });
    expect(second.items).toEqual(first.items);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves stale clinics immediately while refreshing them in the background', async () => {
    const old = new Date(Date.now() - OSM_CLINIC_CACHE_TTL_MS - 1);
    await replaceOsmClinicCache(
      [{ id: 'node/1', name: 'Cached Clinic', latitude: 14.5, longitude: 121 }],
      old
    );

    let finish: ((response: Response) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    ) as unknown as typeof fetch;

    const result = await getOsmClinics({ now: new Date(), fetcher });

    expect(result).toMatchObject({ stale: true, items: [{ name: 'Cached Clinic' }] });
    expect(fetcher).toHaveBeenCalledTimes(1);

    finish?.(
      overpass([{ type: 'node', id: 2, lat: 14.61, lon: 121.02, tags: { name: 'Fresh Clinic' } }])
    );
    await refreshOsmClinicCache(fetcher);

    expect((await findOsmClinicCache())?.clinics).toEqual([
      expect.objectContaining({ id: 'node/2', name: 'Fresh Clinic' }),
    ]);
  });
});
