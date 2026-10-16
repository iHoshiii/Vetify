import { afterEach, describe, expect, it, vi } from 'vitest';

import { basemapAttribution, basemapUrl } from '../components/basemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

const PLAIN = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

describe('basemapUrl', () => {
  it.each([undefined, '', '   '])('uses OSM when the CARTO key is %j', (key) => {
    vi.stubEnv('VITE_CARTO_KEY', key);
    expect(basemapUrl('land')).toBe(OSM);
    expect(basemapUrl('labels')).toBeNull();
    expect(basemapAttribution()).toContain('https://www.openstreetmap.org/copyright');
    expect(basemapAttribution()).not.toContain('CARTO');
  });

  it('appends the key as a query parameter, leaving the path alone', () => {
    vi.stubEnv('VITE_CARTO_KEY', 'abc123');

    expect(basemapUrl('land')).toBe(`${PLAIN}?key=abc123`);
    expect(basemapUrl('labels')).toBe(
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png?key=abc123'
    );
  });

  it('escapes a key rather than letting it end the query', () => {
    vi.stubEnv('VITE_CARTO_KEY', ' a&b c ');

    expect(basemapUrl('land')).toBe(`${PLAIN}?key=a%26b%20c`);
  });

  it('draws the labels from a different style than the land', () => {
    vi.stubEnv('VITE_CARTO_KEY', 'abc123');

    expect(basemapUrl('land')).toContain('/light_all/');
    expect(basemapUrl('labels')).toContain('/light_only_labels/');
  });
});

describe('basemapAttribution', () => {
  it('credits both the tiles and the data, which is what the free tier asks for', () => {
    vi.stubEnv('VITE_CARTO_KEY', 'abc123');
    expect(basemapAttribution()).toContain('CARTO');
    expect(basemapAttribution()).toContain('OpenStreetMap');
    expect(basemapAttribution()).toContain('https://carto.com/attributions');
    expect(basemapAttribution()).toContain('https://www.openstreetmap.org/copyright');
  });
});
