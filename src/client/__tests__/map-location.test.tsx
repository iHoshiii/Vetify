import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import ProfessionalMapLocationPage from '../pages/professionals/map-location-page';
import type { OwnProfessional, ProfessionalAddressView } from '../services/professionals.service';

// The page is a read-only report of what the application was approved with: the pins a
// reviewer read, whether each one reached the public map, and the address to write to for a
// correction. Nothing on it writes, so what is under test is what it says and what it omits.

// Leaflet is stubbed to a line of text. The real map is covered in `map-pin.test.tsx`, and
// mounting it here would test the same wiring twice against a browser jsdom does not have.
vi.mock('@/components/vetmap', () => ({
  default: ({
    center,
    interactive,
    vets,
  }: {
    center: [number, number];
    interactive: boolean;
    vets: unknown[];
  }) => (
    <div data-testid="vetmap">
      map at {center[0]}, {center[1]}, {interactive ? 'draggable' : 'still'}, {vets.length} marker
    </div>
  ),
}));

/** Resolved by the layout's outlet context, which is not this page's business. */
const outlet: { application: OwnProfessional } = { application: {} as OwnProfessional };
vi.mock('../pages/professionals/professional-layout', () => ({
  useConsoleApplication: () => outlet.application,
}));

const PIN = { latitude: 10.3157, longitude: 123.8854, placedAt: '2026-08-25T00:00:00.000Z' };
const FIX = {
  latitude: 14.5995,
  longitude: 120.9842,
  accuracyMeters: 12,
  capturedAt: '2026-08-20T09:00:00.000Z',
};

function addressView(overrides: Partial<ProfessionalAddressView> = {}): ProfessionalAddressView {
  return {
    kind: 'clinic',
    line1: '12 Mabini Street',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    fix: null,
    mapPin: null,
    showOnMap: false,
    ...overrides,
  };
}

// Enough of an application to draw a marker from. The other thirty fields say nothing about
// what is being tested and would need editing every time the type grows.
function renderPage(addresses: ProfessionalAddressView[]) {
  outlet.application = {
    id: 'app-1',
    fullName: 'Dr Ana Reyes',
    clinicName: 'Mabini Veterinary',
    specialties: ['surgery'],
    hourlyRate: 900,
    availabilityStatus: 'available',
    addresses,
  } as OwnProfessional;

  return render(
    <MemoryRouter>
      <ProfessionalMapLocationPage />
    </MemoryRouter>
  );
}

describe('what a vet reads off their own pins', () => {
  it('names the coordinate that was published', async () => {
    renderPage([addressView({ mapPin: PIN, showOnMap: true })]);

    expect(screen.getByText('On the map')).toBeInTheDocument();
    expect(screen.getByText(/pinned at 10\.31570, 123\.88540/i)).toBeInTheDocument();
    await screen.findByTestId('vetmap');
  });

  it('draws that pin as a still, with the vet on it', async () => {
    renderPage([addressView({ mapPin: PIN, showOnMap: true })]);

    expect(await screen.findByTestId('vetmap')).toHaveTextContent(
      'map at 10.3157, 123.8854, still, 1 marker'
    );
  });

  it('says an address nobody pinned is not on the map, and draws nothing', () => {
    renderPage([addressView()]);

    expect(screen.getByText('Not on the map')).toBeInTheDocument();
    expect(screen.getByText(/no marker was dropped for this address/i)).toBeInTheDocument();
    expect(screen.queryByTestId('vetmap')).toBeNull();
  });

  it('keeps the reading taken at the door to itself', () => {
    renderPage([addressView({ fix: FIX })]);

    expect(screen.getByText('Not on the map')).toBeInTheDocument();
    expect(screen.queryByText(/14\.5995/)).toBeNull();
  });

  it('reports each filed address on its own', async () => {
    renderPage([
      addressView({ mapPin: PIN, showOnMap: true }),
      addressView({ kind: 'home', line1: '7 Sampaguita Street' }),
    ]);

    expect(screen.getByRole('heading', { name: /clinic address/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /home address/i })).toBeInTheDocument();
    expect(screen.getByText('On the map')).toBeInTheDocument();
    expect(screen.getByText('Not on the map')).toBeInTheDocument();
    await screen.findByTestId('vetmap');
  });

  it('says so plainly when the application has no address', () => {
    renderPage([]);

    expect(screen.getByText(/no addresses on your application/i)).toBeInTheDocument();
  });
});

describe('there is nothing here to change it with', () => {
  it('offers no switch, no picker and no save', async () => {
    renderPage([addressView({ mapPin: PIN, showOnMap: true }), addressView({ kind: 'home' })]);

    await screen.findByTestId('vetmap');

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends the vet to support instead', async () => {
    renderPage([addressView({ mapPin: PIN, showOnMap: true })]);

    expect(screen.getByRole('link', { name: /support\.vetify@gmail\.com/i })).toHaveAttribute(
      'href',
      'mailto:support.vetify@gmail.com'
    );
    expect(screen.getByText(/cannot be edited/i)).toBeInTheDocument();
    await screen.findByTestId('vetmap');
  });
});
