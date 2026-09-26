export async function markerClusterGroup(
  L: typeof import('leaflet'),
  options: import('leaflet').MarkerClusterGroupOptions = {}
): Promise<import('leaflet').MarkerClusterGroup> {
  await Promise.all([import('leaflet.markercluster'), import('./cluster.css')]);
  return L.markerClusterGroup(options);
}
