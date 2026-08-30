import { afterEach, describe, expect, it, vi } from 'vitest';

import { BASEMAP_ATTRIBUTION, basemapUrl } from '../components/basemap';

/**
 * The tile URL, which is the whole of the CARTO key question.
 *
 * Worth its own test because both maps now read their tiles from here, and the two
 * things that can go wrong are silent: a key that never reaches the URL leaves every
 * tile stamped "API KEY REQUIRED", and a key spliced in carelessly breaks Leaflet's
 * `{z}/{x}/{y}` substitution, which shows up as a blank map rather than an error.
 *
 * The environment is stubbed in every case, including the unset one, so the result does
 * not depend on whether the developer running the suite happens to hold a key.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

const PLAIN = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

describe('basemapUrl', () => {
  it('asks for the plain tile when no key is held', () => {
    vi.stubEnv('VITE_CARTO_KEY', undefined);

    expect(basemapUrl('land')).toBe(PLAIN);
  });

  it('treats a blank var as no key, the way .env.example ships it', () => {
    vi.stubEnv('VITE_CARTO_KEY', '');

    expect(basemapUrl('land')).toBe(PLAIN);
    expect(basemapUrl('labels')).not.toContain('key=');
  });

  it('appends the key as a query parameter, leaving the path alone', () => {
    vi.stubEnv('VITE_CARTO_KEY', 'abc123');

    // Leaflet substitutes the placeholders itself, so all four have to survive intact
    // and the key has to sit after the filename rather than inside the path.
    expect(basemapUrl('land')).toBe(`${PLAIN}?key=abc123`);
    expect(basemapUrl('labels')).toBe(
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png?key=abc123'
    );
  });

  it('escapes a key rather than letting it end the query', () => {
    vi.stubEnv('VITE_CARTO_KEY', 'a&b c');

    expect(basemapUrl('land')).toBe(`${PLAIN}?key=a%26b%20c`);
  });

  it('draws the labels from a different style than the land', () => {
    vi.stubEnv('VITE_CARTO_KEY', '');

    expect(basemapUrl('land')).toContain('/light_all/');
    expect(basemapUrl('labels')).toContain('/light_only_labels/');
  });
});

describe('BASEMAP_ATTRIBUTION', () => {
  it('credits both the tiles and the data, which is what the free tier asks for', () => {
    expect(BASEMAP_ATTRIBUTION).toContain('CARTO');
    expect(BASEMAP_ATTRIBUTION).toContain('OpenStreetMap');
    expect(BASEMAP_ATTRIBUTION).toContain('https://carto.com/attributions');
    expect(BASEMAP_ATTRIBUTION).toContain('https://www.openstreetmap.org/copyright');
  });
});
