import { useEffect } from 'react';

import type { MapUserLocation } from '@/types/vetmap';
import type { MapVet, OsmClinic } from '@/types/map-prof-vet';
import { vetLabel } from '../map-prof-vet/vet-label';
import { createMarkerIcon, OSM_PALETTE, POPUP_ANCHOR, VETIFY_PALETTE } from '../marker-icon';
import { markerClusterGroup } from './marker-cluster';
import { clinicPopupHtml, escapeHtml, interceptLinks, vetPopupHtml } from './map-popup';

interface MapMarkerOptions {
  ready: boolean;
  leafletRef: React.MutableRefObject<typeof import('leaflet') | null>;
  leafletMapRef: React.MutableRefObject<import('leaflet').Map | null>;
  clinicLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  vetLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  youLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  centredRef: React.MutableRefObject<boolean>;
  visibleClinics: OsmClinic[];
  vets: MapVet[];
  userLocation: MapUserLocation | null;
  navigateRef: React.MutableRefObject<((path: string) => void) | undefined>;
  interactive: boolean;
  zoom: number;
}

export function useMapMarkers({
  ready,
  leafletRef,
  leafletMapRef,
  clinicLayerRef,
  vetLayerRef,
  youLayerRef,
  centredRef,
  visibleClinics,
  vets,
  userLocation,
  navigateRef,
  interactive,
  zoom,
}: MapMarkerOptions) {
  useEffect(() => {
    const L = leafletRef.current;
    const vetGroup = vetLayerRef.current;
    if (!ready || !L || !vetGroup) return;

    const vetIcons = {
      clinic: createMarkerIcon(L, VETIFY_PALETTE, 'clinic'),
      home: createMarkerIcon(L, VETIFY_PALETTE, 'home'),
    };
    vetGroup.clearLayers();

    vets.forEach((vet) => {
      const marker = L.marker([vet.latitude, vet.longitude], {
        icon: vetIcons[vet.kind],
        zIndexOffset: 1000,
      });

      marker.bindTooltip(escapeHtml(vetLabel(vet)), {
        direction: 'top',
        offset: POPUP_ANCHOR,
        className: 'vet-label vetify-label',
      });
      marker.bindPopup(vetPopupHtml(vet), { maxWidth: 300 });
      marker.on('popupopen', (event) => {
        const popup = (event as import('leaflet').PopupEvent).popup;
        interceptLinks(popup.getElement(), navigateRef.current);
      });

      vetGroup.addLayer(marker);
    });
  }, [ready, vets, leafletRef, vetLayerRef, navigateRef]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = leafletMapRef.current;
    if (!ready || !L || !map) return;

    let cancelled = false;

    async function drawClinics() {
      if (!visibleClinics.length) {
        clinicLayerRef.current?.clearLayers();
        return;
      }

      let clinicGroup = clinicLayerRef.current;
      if (!clinicGroup) {
        clinicGroup = await markerClusterGroup(L, {
          chunkedLoading: true,
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
        });
        if (cancelled || leafletMapRef.current !== map) return;
        clinicLayerRef.current = clinicGroup;
        map.addLayer(clinicGroup);
      }

      clinicGroup.clearLayers();
      const clinicIcon = createMarkerIcon(L, OSM_PALETTE, 'clinic');
      visibleClinics.forEach((clinic) => {
        const marker = L.marker([clinic.latitude, clinic.longitude], { icon: clinicIcon });
        marker.bindTooltip(escapeHtml(clinic.name), {
          direction: 'top',
          offset: POPUP_ANCHOR,
          className: 'vet-label',
        });
        marker.bindPopup(clinicPopupHtml(clinic), { maxWidth: 280 });
        clinicGroup.addLayer(marker);
      });
    }

    void drawClinics();
    return () => {
      cancelled = true;
    };
  }, [ready, visibleClinics, leafletRef, leafletMapRef, clinicLayerRef]);
  useEffect(() => {
    const L = leafletRef.current;
    const map = leafletMapRef.current;
    const youGroup = youLayerRef.current;
    if (!ready || !L || !map || !youGroup) return;

    youGroup.clearLayers();
    if (!userLocation) return;

    const at: [number, number] = [userLocation.latitude, userLocation.longitude];
    if (userLocation.accuracyMeters) {
      L.circle(at, {
        radius: userLocation.accuracyMeters,
        color: '#0f766e',
        weight: 1,
        fillColor: '#14b8a6',
        fillOpacity: 0.12,
      }).addTo(youGroup);
    }

    L.circleMarker(at, {
      radius: 6,
      color: '#ffffff',
      weight: 2,
      fillColor: '#0f766e',
      fillOpacity: 1,
    })
      .bindTooltip('You are here', { direction: 'top', offset: [0, -10], className: 'vet-label' })
      .addTo(youGroup);
    if (!centredRef.current) {
      centredRef.current = true;
      const close = Math.max(zoom, 13);
      if (interactive) map.flyTo(at, close, { duration: 1.2 });
      else map.setView(at, close);
    }
  }, [ready, userLocation, interactive, zoom, leafletRef, leafletMapRef, youLayerRef, centredRef]);
}
