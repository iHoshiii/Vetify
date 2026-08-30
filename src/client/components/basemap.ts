const TILES = 'https://{s}.basemaps.cartocdn.com';
export const BASEMAP_LAYERS = { land: 'light_all', labels: 'light_only_labels' } as const;
export function basemapUrl(layer: keyof typeof BASEMAP_LAYERS): string {
  const key = import.meta.env.VITE_CARTO_KEY as string | undefined;
  const url = `${TILES}/${BASEMAP_LAYERS[layer]}/{z}/{x}/{y}{r}.png`;
  return key ? `${url}?key=${encodeURIComponent(key)}` : url;
}
export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
