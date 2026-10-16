import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Map, LayerGroup } from 'leaflet';
import { useOsmClinics } from '@/hooks/useOsmClinics';
import { useProfessionals } from '@/hooks/useProfessionals';
import { toMapVets } from '@/components/map-prof-vet/to-map-vets';
import { vetLabel } from '@/components/map-prof-vet/vet-label';
import { markerClusterGroup } from '@/components/vetmap/marker-cluster';
import { createMarkerIcon, OSM_PALETTE, VETIFY_PALETTE } from '@/components/marker-icon';

export function usePinReferences(
  map: MutableRefObject<Map | null>,
  ready: boolean,
  onReady?: () => void
) {
  const directory = useProfessionals({ limit: 20 });
  const clinics = useOsmClinics(true);
  const clusterRef = useRef<LayerGroup | null>(null);
  const readyCallback = useRef(onReady);
  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    void import('leaflet').then(async ({ default: L }) => {
      if (cancelled || !map.current) return;
      clusterRef.current?.remove();
      const cluster = await markerClusterGroup(L);
      if (cancelled || !map.current) return;
      cluster.addTo(map.current);
      const clinicIcon = createMarkerIcon(L, OSM_PALETTE, 'clinic');
      const vetMarkers = toMapVets(directory.data?.items ?? []).map((vet) =>
        L.marker([vet.latitude, vet.longitude], {
          icon: createMarkerIcon(L, VETIFY_PALETTE, vet.kind),
          opacity: 0.85,
        }).bindTooltip(vetLabel(vet), { direction: 'top' })
      );
      const clinicMarkers = (clinics.data ?? []).map((clinic) =>
        L.marker([clinic.latitude, clinic.longitude], {
          icon: clinicIcon,
          opacity: 0.8,
        }).bindTooltip(clinic.name, { direction: 'top' })
      );
      [...vetMarkers, ...clinicMarkers].forEach((marker) => cluster.addLayer(marker));
      clusterRef.current = cluster;
      if (directory.isFetched && clinics.isFetched) readyCallback.current?.();
    });
    return () => {
      cancelled = true;
    };
  }, [clinics.data, clinics.isFetched, directory.data, directory.isFetched, map, ready]);
}
