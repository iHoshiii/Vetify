// customize vet clinic icon on the map

export type MarkerPalette = {
  fill: string;
  stroke: string;
  shadow: string;
};
export const OSM_PALETTE: MarkerPalette = {
  fill: '#2563eb',
  stroke: '#1d4ed8',
  shadow: 'rgba(37,99,235,0.35)',
};

export const VETIFY_PALETTE: MarkerPalette = {
  fill: '#0f766e',
  stroke: '#115e59',
  shadow: 'rgba(15,118,110,0.4)',
};
export const MARKER_SIZE: [number, number] = [36, 44];
export const MARKER_ANCHOR: [number, number] = [18, 44];
export const POPUP_ANCHOR: [number, number] = [0, -46];
export type MarkerGlyph = 'clinic' | 'home';

// What the pin is standing on: a cross for a clinic, a house for a home.
const GLYPHS: Record<MarkerGlyph, string> = {
  clinic:
    '<rect x="16.5" y="10.4" width="3" height="9.2" rx="0.9"/><rect x="13.4" y="13.5" width="9.2" height="3" rx="0.9"/>',
  home: '<path d="M18 9.6 L24.6 15.6 H22.2 V20.4 H13.8 V15.6 H11.4 Z"/><rect x="16.9" y="16.8" width="2.2" height="3.6" fill="white"/>',
};

export function markerHtml(
  palette: MarkerPalette = OSM_PALETTE,
  glyph: MarkerGlyph = 'clinic'
): string {
  const [width, height] = MARKER_SIZE;

  return `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 8px ${palette.shadow});">
        <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <path d="M18 2C10.268 2 4 8.268 4 16c0 9.941 14 26 14 26S32 25.941 32 16C32 8.268 25.732 2 18 2z"
            fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="1.5"/>
          <circle cx="18" cy="15" r="9" fill="white" opacity="0.95"/>
          <g fill="${palette.fill}">${GLYPHS[glyph]}</g>
        </svg>
      </div>
    `;
}

export function createMarkerIcon(
  L: typeof import('leaflet'),
  palette: MarkerPalette = OSM_PALETTE,
  glyph: MarkerGlyph = 'clinic'
) {
  return L.divIcon({
    className: '',
    iconSize: MARKER_SIZE,
    iconAnchor: MARKER_ANCHOR,
    popupAnchor: POPUP_ANCHOR,
    html: markerHtml(palette, glyph),
  });
}
