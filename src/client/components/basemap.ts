/**
 * The tiles under every Vetify map, decided in one place.
 *
 * CARTO began requiring a key on its raster basemaps and now stamps "API KEY REQUIRED"
 * diagonally across every unauthenticated tile. Nothing is blocked and the map still
 * draws — but the stamp lands on top of the country, which is reason enough to hold a
 * key: it is free for five million tiles a month and needs no CARTO account.
 *
 * The key lives in `VITE_CARTO_KEY`, so Vite compiles it into the browser bundle and
 * anybody can read it out of a tile URL. That is what a basemap key is: it identifies
 * this project to CARTO and authorises nothing here, which is why it belongs in a
 * `VITE_`-prefixed variable rather than beside the secrets the browser must never see.
 * Left unset, the maps keep working with the watermark, so a fresh clone is not a
 * broken clone.
 *
 * Shared rather than copied because the public map and the vet's own pin picker should
 * not be able to drift onto different basemaps — the picker's whole promise is that the
 * vet is looking at the map a stranger will look at.
 */

/** `{s}` picks a subdomain, `{r}` asks for the retina tile on a dense screen. */
const TILES = 'https://{s}.basemaps.cartocdn.com';

/** The land, and the place names that ride in a pane above it. */
export const BASEMAP_LAYERS = { land: 'light_all', labels: 'light_only_labels' } as const;

/** Read per call rather than at import, so a test can set the key and mount again. */
export function basemapUrl(layer: keyof typeof BASEMAP_LAYERS): string {
  const key = import.meta.env.VITE_CARTO_KEY as string | undefined;
  const url = `${TILES}/${BASEMAP_LAYERS[layer]}/{z}/{x}/{y}{r}.png`;
  return key ? `${url}?key=${encodeURIComponent(key)}` : url;
}

/**
 * Both credits, on every map that draws these tiles: CARTO asks for them in exchange
 * for the free tier, and OpenStreetMap for the data underneath. Leaflet only renders
 * them if the map keeps an attribution control, so both maps add one back — without
 * Leaflet's own "Leaflet" prefix, which credits nobody for the tiles.
 */
export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
