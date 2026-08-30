import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PinPicker, { type Point } from '../pages/professionals/_components/pin-picker';

/**
 * Dropping the pin.
 *
 * Leaflet is stubbed rather than run: a real map measures a container jsdom lays out at
 * zero pixels, and none of what is being tested here is Leaflet's. What is being tested is
 * the wiring around it — that the marker's `dragend` reaches the readout, that a tap moves
 * the pin, that the map opens where the vet left off, and that the device button places a
 * reading. The stub records the handlers the component registers so a test can fire them
 * the way Leaflet would.
 *
 * One picker per test, deliberately. `PinPicker` loads Leaflet with a dynamic import, and
 * under Vitest 2 two of those in flight at once race: one gets the factory mock and the
 * other silently gets the real module. The page that mounts a picker per address is tested
 * in `map-location.test.tsx`, where the picker itself is the stub and Leaflet never loads.
 */

const leaflet = vi.hoisted(() => {
  type Handler = (event?: unknown) => void;

  class FakeMarker {
    latlng: { lat: number; lng: number };
    handlers: Record<string, Handler> = {};

    constructor(at: [number, number]) {
      this.latlng = { lat: at[0], lng: at[1] };
    }

    addTo() {
      return this;
    }

    setLatLng(at: [number, number]) {
      this.latlng = { lat: at[0], lng: at[1] };
      return this;
    }

    getLatLng() {
      return this.latlng;
    }

    on(event: string, handler: Handler) {
      this.handlers[event] = handler;
      return this;
    }
  }

  class FakeMap {
    center: [number, number];
    zoom: number;
    handlers: Record<string, Handler> = {};

    constructor(options: { center: [number, number]; zoom: number }) {
      this.center = options.center;
      this.zoom = options.zoom;
    }

    setView(center: [number, number], zoom: number) {
      this.center = center;
      this.zoom = zoom;
      return this;
    }

    on(event: string, handler: Handler) {
      this.handlers[event] = handler;
      return this;
    }

    invalidateSize() {}
    remove() {}
  }

  const state = { maps: [] as FakeMap[], markers: [] as FakeMarker[] };

  const L = {
    map(_host: HTMLElement, options: { center: [number, number]; zoom: number }) {
      const instance = new FakeMap(options);
      state.maps.push(instance);
      return instance;
    },
    tileLayer: () => ({ addTo: () => undefined }),
    marker(at: [number, number]) {
      const pin = new FakeMarker(at);
      state.markers.push(pin);
      return pin;
    },
    divIcon: (options: unknown) => options,
  };

  return { state, L };
});

vi.mock('leaflet', () => ({ default: leaflet.L }));

beforeEach(() => {
  leaflet.state.maps.length = 0;
  leaflet.state.markers.length = 0;
});

/** The picker is controlled, so a test has to hold the coordinate the way the page does. */
function Harness({
  initial = null,
  fallback = null,
}: {
  initial?: Point | null;
  fallback?: Point | null;
}) {
  const [pin, setPin] = useState<Point | null>(initial);
  return <PinPicker value={pin} onChange={setPin} fallback={fallback} />;
}

async function mounted() {
  await waitFor(() => expect(leaflet.state.markers).toHaveLength(1));
  return { map: leaflet.state.maps[0], marker: leaflet.state.markers[0] };
}

describe('placing the pin', () => {
  it('says there is no pin yet before one is placed', async () => {
    render(<Harness />);
    await mounted();

    expect(screen.getByText(/no pin yet/i)).toBeInTheDocument();
  });

  it('follows the marker the vet drags', async () => {
    render(<Harness />);
    const { marker } = await mounted();

    // Leaflet moves the marker itself while a finger is down; the component reads where
    // it was let go.
    marker.setLatLng([10.315712, 123.885437]);
    act(() => marker.handlers.dragend());

    expect(screen.getByText('10.315712, 123.885437')).toBeInTheDocument();
  });

  it('moves the pin to a tapped spot too', async () => {
    render(<Harness />);
    const { map, marker } = await mounted();

    act(() => map.handlers.click({ latlng: { lat: 14.6, lng: 121.05 } }));

    expect(marker.getLatLng()).toEqual({ lat: 14.6, lng: 121.05 });
    expect(screen.getByText('14.600000, 121.050000')).toBeInTheDocument();
  });

  it('leaves the view alone when the pin is dragged or tapped', async () => {
    render(<Harness initial={{ latitude: 10.3157, longitude: 123.8854 }} />);
    const { map } = await mounted();

    act(() => map.handlers.click({ latlng: { lat: 14.6, lng: 121.05 } }));

    // Yanking the map out from under the finger that just moved something is how a
    // picker feels broken.
    expect(map.center).toEqual([10.3157, 123.8854]);
  });
});

describe('where the map opens', () => {
  it('opens on the pin the vet left, close enough to see a building', async () => {
    render(<Harness initial={{ latitude: 10.3157, longitude: 123.8854 }} />);
    const { map, marker } = await mounted();

    expect(map.center).toEqual([10.3157, 123.8854]);
    expect(map.zoom).toBe(17);
    expect(marker.getLatLng()).toEqual({ lat: 10.3157, lng: 123.8854 });
  });

  it('falls back to the reading taken at the address, so the vet confirms rather than hunts', async () => {
    render(<Harness fallback={{ latitude: 14.5995, longitude: 120.9842 }} />);
    const { map } = await mounted();

    expect(map.center).toEqual([14.5995, 120.9842]);
    expect(map.zoom).toBe(17);
    // Steering the view only — nothing is claimed as placed.
    expect(screen.getByText(/no pin yet/i)).toBeInTheDocument();
  });

  it('opens on the country when there is nothing to open on', async () => {
    render(<Harness />);
    const { map } = await mounted();

    expect(map.zoom).toBe(6);
  });
});

describe('the device, for a vet standing at the door', () => {
  it('places the pin on the reading and closes in on it', async () => {
    let report: ((position: unknown) => void) | null = null;
    const geolocation = {
      watchPosition: vi.fn((success: (position: unknown) => void) => {
        report = success;
        return 1;
      }),
      clearWatch: vi.fn(),
    };
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });

    render(<Harness />);
    const { map } = await mounted();

    await userEvent.click(screen.getByRole('button', { name: /use my current location/i }));
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);

    act(() => report?.({ coords: { latitude: 10.31, longitude: 123.88, accuracy: 8 } }));

    expect(screen.getByText('10.310000, 123.880000')).toBeInTheDocument();
    expect(map.center).toEqual([10.31, 123.88]);
    expect(map.zoom).toBe(18);
    // Good enough to keep, so the watch stops rather than draining a phone.
    expect(geolocation.clearWatch).toHaveBeenCalledWith(1);
  });
});
