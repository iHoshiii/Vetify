import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MapPage from '@/pages/map/map-page';
import { fetchOsmClinics } from '@/services/osm.service';
import { listProfessionals, listProfessionalsNear } from '@/services/professionals.service';

vi.mock('@/pages/map/_components/interactive-map/map-official', () => ({
  default: () => <div>Map preview</div>,
}));
vi.mock('@/services/osm.service', () => ({ fetchOsmClinics: vi.fn() }));
vi.mock('@/services/professionals.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/professionals.service')>()),
  listProfessionals: vi.fn(),
  listProfessionalsNear: vi.fn(),
}));

const clinic = {
  id: 'node/1',
  name: 'Recovered animal clinic',
  latitude: 10.3158,
  longitude: 123.8855,
};
const clients: QueryClient[] = [];

function renderMap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProfessionals).mockResolvedValue({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  vi.mocked(listProfessionalsNear).mockResolvedValue({ items: [], radiusKm: 25 });
  vi.mocked(fetchOsmClinics).mockReset();
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({
          coords: { latitude: 10.3157, longitude: 123.8854, accuracy: 10 },
        } as GeolocationPosition)
      ),
    },
  });
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
});

describe('map updates', () => {
  it('retries a failed clinic request at the same location and clears its warning', async () => {
    vi.mocked(fetchOsmClinics)
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce([clinic]);
    const user = renderMap();
    expect(fetchOsmClinics).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await screen.findByText(/OpenStreetMap could not be reached/);

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByText(clinic.name)).toBeInTheDocument();
    expect(screen.queryByText(/OpenStreetMap could not be reached/)).not.toBeInTheDocument();
    expect(fetchOsmClinics).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(listProfessionalsNear).toHaveBeenCalledTimes(2));
  });

  it('refreshes cached clinics and vets without changing the location', async () => {
    vi.mocked(fetchOsmClinics).mockResolvedValueOnce([]).mockResolvedValueOnce([clinic]);
    const user = renderMap();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled());
    const directoryCalls = vi.mocked(listProfessionals).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByText(clinic.name)).toBeInTheDocument();
    expect(fetchOsmClinics).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(listProfessionals).toHaveBeenCalledTimes(directoryCalls + 1));
  });
});
