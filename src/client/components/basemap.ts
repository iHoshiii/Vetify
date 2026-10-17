const TILES = 'https://{s}.basemaps.cartocdn.com';
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const cartoKey = () => (import.meta.env.VITE_CARTO_KEY as string | undefined)?.trim();
export const BASEMAP_LAYERS = { land: 'light_all', labels: 'light_only_labels' } as const;
export function basemapUrl(layer: 'land'): string;
export function basemapUrl(layer: 'labels'): string | null;
export function basemapUrl(layer: keyof typeof BASEMAP_LAYERS): string | null {
  const key = cartoKey();
  if (!key) return layer === 'land' ? OSM_TILES : null;
  const url = `${TILES}/${BASEMAP_LAYERS[layer]}/{z}/{x}/{y}{r}.png`;
  return `${url}?key=${encodeURIComponent(key)}`;
}
export function basemapAttribution(): string {
  return cartoKey()
    ? `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`
    : OSM_ATTRIBUTION;
}
