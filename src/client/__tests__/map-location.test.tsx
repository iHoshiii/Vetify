import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalMapLocationPage from '../pages/professionals/map-location-page';
import type { OwnProfessional, ProfessionalAddressView } from '../services/professionals.service';

/**
 * Two decisions per address, kept apart.
 *
 * The rules under test are the page's own: a switch that cannot be pressed until there is
 * a pin to publish, a marker seeded from the reading taken at the door so the vet confirms
 * rather than hunts, one card per address the vet actually has, and a payload naming the
 * one address that changed.
 *
 * The picker is stubbed down to a button that reports a coordinate. It is a Leaflet map,
 * tested against a stubbed Leaflet in `map-pin.test.tsx`; mounting two of the real thing
 * here would test the same wiring twice and, under Vitest 2, race the two dynamic imports
 * of Leaflet against each other.
 */

type Coordinate = { latitude: number; longitude: number };

vi.mock('../pages/professionals/_components/pin-picker', () => ({
  default: ({
    value,
    onChange,
    fallback,
  }: {
    value: Coordinate | null;
    onChange: (point: Coordinate) => void;
    fallback: Coordinate | null;
  }) => (
    <div>
      <p>pin: {value ? `${value.latitude}, ${value.longitude}` : 'none'}</p>
      <p>opens at {fallback ? `${fallback.latitude}, ${fallback.longitude}` : 'nowhere'}</p>
      <button type="button" onClick={() => onChange({ latitude: 10.5, longitude: 123.5 })}>
        drop a pin
      </button>
    </div>
  ),
}));

const update = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
vi.mock('../hooks/useProfessionals', () => ({ useUpdateMapLocation: () => update }));

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

/**
 * The page reads one field of an application. Spelling out the other thirty would say
 * nothing about what is being tested and would need editing every time the type grows.
 */
function renderPage(addresses: ProfessionalAddressView[]) {
  outlet.application = { addresses } as OwnProfessional;

  return render(
    <MemoryRouter>
      <ProfessionalMapLocationPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  update.mutate.mockReset();
  update.isPending = false;
});

describe('the switch and the pin it waits for', () => {
  it('cannot be pressed until there is something to publish', async () => {
    renderPage([addressView()]);

    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText(/pin your location on the map first/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /drop a pin/i }));

    expect(screen.getByRole('checkbox')).toBeEnabled();
    expect(screen.getByText(/the pin appears on the public map/i)).toBeInTheDocument();
  });

  it('reopens on the pin the vet left, and calls it saved', () => {
    renderPage([addressView({ mapPin: PIN, showOnMap: true })]);

    expect(screen.getByText('pin: 10.3157, 123.8854')).toBeInTheDocument();
    expect(screen.getByText('On the map')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    // Nothing has changed, so there is nothing to send.
    expect(screen.getByRole('button', { name: /^saved$/i })).toBeDisabled();
  });

  it('starts from the reading taken at the door without publishing it', () => {
    renderPage([addressView({ fix: FIX })]);

    expect(screen.getByText('pin: 14.5995, 120.9842')).toBeInTheDocument();
    expect(screen.getByText('Not on the map')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    // A placement worth keeping, so the button offers to keep it — nothing is stored yet.
    expect(screen.getByRole('button', { name: /save this address/i })).toBeEnabled();
    expect(update.mutate).not.toHaveBeenCalled();
  });
});

describe('one card per address', () => {
  it('gives each address its own decision', () => {
    renderPage([
      addressView({ mapPin: PIN, showOnMap: true }),
      addressView({ kind: 'home', line1: '7 Sampaguita Street' }),
    ]);

    expect(screen.getByRole('heading', { name: /clinic address/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /home address/i })).toBeInTheDocument();
    expect(screen.getByText('On the map')).toBeInTheDocument();
    expect(screen.getByText('Not on the map')).toBeInTheDocument();

    const [clinic, home] = screen.getAllByRole('checkbox');
    expect(clinic).toBeChecked();
    expect(home).not.toBeChecked();
    expect(home).toBeDisabled();
  });

  it('opens a card with no reading of its own at another address of the same vet', () => {
    renderPage([addressView(), addressView({ kind: 'home', line1: '7 Sampaguita', fix: FIX })]);

    expect(screen.getByText('pin: none')).toBeInTheDocument();
    expect(screen.getAllByText('opens at 14.5995, 120.9842')).toHaveLength(2);
  });

  it('says so plainly when there is no address to pin', () => {
    renderPage([]);

    expect(screen.getByText(/no addresses on your application/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('saving', () => {
  it('names the one address that changed, and sends its pin with the decision', async () => {
    renderPage([
      addressView({ mapPin: PIN }),
      addressView({ kind: 'home', line1: '7 Sampaguita Street' }),
    ]);

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(screen.getByRole('button', { name: /save this address/i }));

    expect(update.mutate).toHaveBeenCalledTimes(1);
    expect(update.mutate.mock.calls[0][0]).toEqual({
      kind: 'clinic',
      // The stored placement, without the `placedAt` the server keeps for itself.
      pin: { latitude: 10.3157, longitude: 123.8854 },
      showOnMap: true,
    });
  });

  it('sends a pin placed here even when the switch stays off', async () => {
    renderPage([addressView()]);

    await userEvent.click(screen.getByRole('button', { name: /drop a pin/i }));
    await userEvent.click(screen.getByRole('button', { name: /save this address/i }));

    expect(update.mutate.mock.calls[0][0]).toEqual({
      kind: 'clinic',
      pin: { latitude: 10.5, longitude: 123.5 },
      showOnMap: false,
    });
  });

  it('repeats what went wrong rather than looking saved', async () => {
    renderPage([addressView({ fix: FIX })]);

    await userEvent.click(screen.getByRole('button', { name: /save this address/i }));
    const [, handlers] = update.mutate.mock.calls[0] as [
      unknown,
      { onError: (error: Error) => void }
    ];
    act(() => handlers.onError(new Error('The server said no.')));

    expect(screen.getByText('The server said no.')).toBeInTheDocument();
  });
});
