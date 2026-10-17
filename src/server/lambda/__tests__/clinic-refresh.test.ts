import { beforeEach, expect, it, vi } from 'vitest';
import { handler } from '../clinic-refresh';
import { initializeLambda } from '../runtime';
import { findOsmClinicCache } from '../../models/osm-clinics';
import { OSM_CLINIC_CACHE_TTL_MS, refreshOsmClinicCache } from '../../services/osm-clinics.service';

vi.mock('../runtime', () => ({ initializeLambda: vi.fn() }));
vi.mock('../../models/osm-clinics', () => ({ findOsmClinicCache: vi.fn() }));
vi.mock('../../services/osm-clinics.service', () => ({
  OSM_CLINIC_CACHE_TTL_MS: 86_400_000,
  refreshOsmClinicCache: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());

it.each([undefined, { refreshedAt: new Date(Date.now() - OSM_CLINIC_CACHE_TTL_MS) }])(
  'awaits a refresh when the clinic cache is missing or expired: %j',
  async (cached) => {
    vi.mocked(findOsmClinicCache).mockResolvedValue(cached as never);
    let finish!: () => void;
    let finished = false;
    vi.mocked(refreshOsmClinicCache).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({} as never);
        })
    );
    const context = { callbackWaitsForEmptyEventLoop: true };
    const invocation = handler({}, context).then(() => {
      finished = true;
    });
    await vi.waitFor(() => expect(refreshOsmClinicCache).toHaveBeenCalledOnce());
    expect(initializeLambda).toHaveBeenCalledOnce();
    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
    expect(finished).toBe(false);
    finish();
    await invocation;
  }
);

it('reuses fresh clinics without calling the external provider', async () => {
  vi.mocked(findOsmClinicCache).mockResolvedValue({ refreshedAt: new Date() } as never);
  await handler({}, { callbackWaitsForEmptyEventLoop: true });
  expect(refreshOsmClinicCache).not.toHaveBeenCalled();
});

it('propagates refresh failures for scheduled retries', async () => {
  vi.mocked(refreshOsmClinicCache).mockRejectedValueOnce(new Error('Provider unavailable'));
  await expect(handler({}, { callbackWaitsForEmptyEventLoop: true })).rejects.toThrow(
    'Provider unavailable'
  );
});
