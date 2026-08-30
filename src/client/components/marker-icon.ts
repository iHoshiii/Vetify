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
export function markerHtml(palette: MarkerPalette = OSM_PALETTE): string {
  const [width, height] = MARKER_SIZE;

  return `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 8px ${palette.shadow});">
        <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <path d="M18 2C10.268 2 4 8.268 4 16c0 9.941 14 26 14 26S32 25.941 32 16C32 8.268 25.732 2 18 2z"
            fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="1.5"/>
          <circle cx="18" cy="15" r="9" fill="white" opacity="0.95"/>
          <g fill="${palette.fill}">
            <ellipse cx="18" cy="17" rx="3.5" ry="2.8"/>
            <ellipse cx="13.5" cy="14.5" rx="2" ry="1.5"/>
            <ellipse cx="22.5" cy="14.5" rx="2" ry="1.5"/>
            <ellipse cx="15.5" cy="11.5" rx="1.8" ry="1.4"/>
            <ellipse cx="20.5" cy="11.5" rx="1.8" ry="1.4"/>
          </g>
        </svg>
      </div>
    `;
}

/**
 * The Leaflet icon.
 *
 * Takes the module rather than importing it, because Leaflet is loaded dynamically —
 * it touches `window` on import, and both callers are inside an effect that has
 * already awaited it.
 */
export function createMarkerIcon(
  L: typeof import('leaflet'),
  palette: MarkerPalette = OSM_PALETTE
) {
  return L.divIcon({
    className: '',
    iconSize: MARKER_SIZE,
    iconAnchor: MARKER_ANCHOR,
    popupAnchor: POPUP_ANCHOR,
    html: markerHtml(palette),
  });
}
