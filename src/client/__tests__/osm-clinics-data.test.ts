import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOsmClinics } from '@/services/osm.service';

afterEach(() => vi.unstubAllGlobals());

describe('OpenStreetMap clinic data', () => {
  it('comes through Vetify instead of contacting Overpass from the browser', async () => {
    const clinic = {
      id: 'node/42',
      name: 'Mabuhay Animal Clinic',
      latitude: 14.6,
      longitude: 121.05,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [clinic] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOsmClinics()).resolves.toEqual([clinic]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/clinics');
  });
});
