import { render, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VetMap from '../components/vetmap';

/**
 * Which view the map settles on, which is the one thing about it a stub can prove.
 *
 * Worth its own file because of the way it broke. `L.map` reads `center` and `zoom` once,
 * when it is constructed, and this map is constructed before any of the three queries
 * feeding it has answered — so the coordinate it opens on is always a guess, and every
 * better answer arrives too late to be read. The preview beside the hero opened on a
 * hard-coded street in Quezon City, and stayed there after somebody in Nueva Vizcaya
 * pressed "use my location": the panel listed their own clinics correctly while the map
 * beside it sat two hundred kilometres away with the "You are here" dot off-screen.
 *
 * Leaflet is stubbed rather than run, as in `map-pin.test.tsx`: a real map measures a
 * container jsdom lays out at zero pixels, and none of what is being tested here is
 * Leaflet's. The stub records every deliberate move of the view, in order and with how it
 * moved, because "flew" and "jumped" are different answers to different questions.
 *
 * One map per test, deliberately — two dynamic imports of a mocked Leaflet in flight at
 * once race, and one of them gets the real module.
 */

const leaflet = vi.hoisted(() => {
  const noop = () => undefined;

  /** Every layer group the map is given: they collect markers and nothing here reads them. */
  class FakeGroup {
    layers: unknown[] = [];
    addTo() {
      return this;
    }
    addLayer(layer: unknown) {
      this.layers.push(layer);
      return this;
    }
    clearLayers() {
      this.layers.length = 0;
      return this;
    }
  }

  type Move = { how: 'set' | 'fly'; centre: [number, number]; zoom: number };

  class FakeMap {
    centre: [number, number];
    zoom: number;
    /** Moves after construction only, which is exactly the behaviour under test. */
    moves: Move[] = [];

    constructor(options: { center: [number, number]; zoom: number }) {
      this.centre = options.center;
      this.zoom = options.zoom;
    }

    private moved(how: Move['how'], centre: [number, number], zoom: number) {
      this.centre = centre;
      this.zoom = zoom;
      this.moves.push({ how, centre, zoom });
      return this;
    }

    setView(centre: [number, number], zoom: number) {
      return this.moved('set', centre, zoom);
    }

    flyTo(centre: [number, number], zoom: number) {
      return this.moved('fly', centre, zoom);
    }

    addLayer() {
      return this;
    }
    remove() {}
  }

  const state = { maps: [] as FakeMap[] };

  /** Markers, circles and the dot: chainable, and none of them assert anything. */
  const stubMarker = () => {
    const self = {
      addTo: () => self,
      bindTooltip: () => self,
      bindPopup: () => self,
      on: () => self,
    };
    return self;
  };

  const L = {
    map(_host: HTMLElement, options: { center: [number, number]; zoom: number }) {
      const instance = new FakeMap(options);
      state.maps.push(instance);
      return instance;
    },
    Icon: { Default: { prototype: {}, mergeOptions: noop } },
    tileLayer: () => ({ addTo: noop }),
    control: { attribution: () => ({ addTo: noop }) },
    markerClusterGroup: () => new FakeGroup(),
    layerGroup: () => new FakeGroup(),
    marker: stubMarker,
    circle: stubMarker,
    circleMarker: stubMarker,
    divIcon: (options: unknown) => options,
  };

  return { state, L };
});

vi.mock('leaflet', () => ({ default: leaflet.L }));
/** Imported for its side effect on `L`, and the stub has the one method it adds. */
vi.mock('leaflet.markercluster', () => ({}));

/** Quezon City, at the zoom the preview opens on: the coordinate that caused this file. */
const MANILA: [number, number] = [14.64, 121.05];
/** Bayombong, Nueva Vizcaya, near enough. */
const HOME = { latitude: 16.4832, longitude: 121.1497, accuracyMeters: 40 };

beforeEach(() => {
  leaflet.state.maps.length = 0;
});

/** The map, once Leaflet has been awaited and the layers are up. */
async function mounted(element: ReactElement) {
  const view = render(element);
  await waitFor(() => expect(leaflet.state.maps).toHaveLength(1));
  return { ...view, map: leaflet.state.maps[0] };
}

describe('a map nobody can drag', () => {
  it('goes to the reader once they say, however it was built', async () => {
    const { rerender, map } = await mounted(
      <VetMap interactive={false} zoom={15} center={MANILA} userLocation={null} />
    );
    expect(map.centre).toEqual(MANILA);

    rerender(<VetMap interactive={false} zoom={15} center={MANILA} userLocation={HOME} />);

    await waitFor(() => expect(map.centre).toEqual([HOME.latitude, HOME.longitude]));
    // Set rather than flown: a second of gliding across a still life is motion nobody
    // asked for, and it is behind two cards at 60% opacity where nobody would see it.
    expect(map.moves.at(-1)?.how).toBe('set');
  });

  it('follows the centre it is handed until then, which it is handed late', async () => {
    const { rerender, map } = await mounted(
      <VetMap interactive={false} zoom={15} center={MANILA} userLocation={null} />
    );

    // What the preview does when the directory query answers: the first pin it is drawing
    // is a better guess at where to open than any coordinate typed into the page.
    rerender(<VetMap interactive={false} zoom={15} center={[16.32, 121.1]} userLocation={null} />);

    await waitFor(() => expect(map.centre).toEqual([16.32, 121.1]));
  });
});

describe('a map somebody can drag', () => {
  it('flies to the reader, and stays put when a better fix arrives', async () => {
    const { rerender, map } = await mounted(
      <VetMap interactive zoom={6} center={[12.87, 121.77]} userLocation={HOME} />
    );

    await waitFor(() => expect(map.moves).toHaveLength(1));
    // Zoomed in to something readable, not left at the whole-country zoom it opened on.
    expect(map.moves[0]).toEqual({ how: 'fly', centre: [HOME.latitude, HOME.longitude], zoom: 13 });

    rerender(
      <VetMap
        interactive
        zoom={6}
        center={[12.87, 121.77]}
        userLocation={{ ...HOME, accuracyMeters: 8 }}
      />
    );

    // Once. Somebody may have panned to a clinic since, and a tighter reading of the same
    // street corner is not a reason to yank the map back.
    await waitFor(() => expect(map.moves).toHaveLength(1));
  });

  it('leaves the view alone when only the props move, because it is theirs', async () => {
    const { rerender, map } = await mounted(
      <VetMap interactive zoom={6} center={[12.87, 121.77]} userLocation={null} />
    );

    rerender(<VetMap interactive zoom={13} center={MANILA} userLocation={null} />);

    await waitFor(() => expect(map.centre).toEqual([12.87, 121.77]));
    expect(map.moves).toHaveLength(0);
  });
});
