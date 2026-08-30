import { useEffect } from 'react';

import { createMarkerIcon, OSM_PALETTE, POPUP_ANCHOR, VETIFY_PALETTE } from '../marker-icon';
import type { MapVet, OsmClinic } from '../map-vets';
import { clinicPopupHtml, escapeHtml, interceptLinks, vetPopupHtml } from './map-popup';
import type { MapUserLocation } from './types';

interface MapMarkerOptions {
  ready: boolean;
  leafletRef: React.MutableRefObject<typeof import('leaflet') | null>;
  leafletMapRef: React.MutableRefObject<import('leaflet').Map | null>;
  clinicLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  vetLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  youLayerRef: React.MutableRefObject<import('leaflet').LayerGroup | null>;
  centredRef: React.MutableRefObject<boolean>;
  /** Already deduped against `vets` by the component. */
  visibleClinics: OsmClinic[];
  vets: MapVet[];
  userLocation: MapUserLocation | null;
  /** Read through a ref so a fresh callback identity does not rebuild every marker. */
  navigateRef: React.MutableRefObject<((path: string) => void) | undefined>;
  interactive: boolean;
  zoom: number;
}

/** Everything drawn on top of the basemap: the two sets of pins, and the reader's dot. */
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
  // ── The pins, refilled whenever either source changes. ──────────────────────
  //
  // An effect of its own rather than lines inside the one that builds the map, which
  // returns early the moment the map exists and has to keep doing so. Both sources are
  // asynchronous and neither waits for the other: the clinics come from Overpass, the
  // vets from a query that may answer before the map is built or long after.
  useEffect(() => {
    const L = leafletRef.current;
    const clinicGroup = clinicLayerRef.current;
    const vetGroup = vetLayerRef.current;
    if (!ready || !L || !clinicGroup || !vetGroup) return;

    const clinicIcon = createMarkerIcon(L, OSM_PALETTE);
    const vetIcon = createMarkerIcon(L, VETIFY_PALETTE);

    // Cleared and refilled rather than diffed. Redrawing a few hundred markers is
    // cheaper than keeping a second index of which ones are already up.
    clinicGroup.clearLayers();
    vetGroup.clearLayers();

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

    vets.forEach((vet) => {
      const marker = L.marker([vet.latitude, vet.longitude], {
        icon: vetIcon,
        // Drawn over the scraped nodes, whichever way latitude would have stacked them.
        zIndexOffset: 1000,
      });

      marker.bindTooltip(escapeHtml(vet.clinicName ?? vet.name), {
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
  }, [ready, visibleClinics, vets, leafletRef, clinicLayerRef, vetLayerRef, navigateRef]);

  // ── Where the reader is. ────────────────────────────────────────────────────
  //
  // A dot and a ring rather than the paw pin. The pin means "a clinic is here", and
  // borrowing it for somebody's own position would say something untrue.
  useEffect(() => {
    const L = leafletRef.current;
    const map = leafletMapRef.current;
    const youGroup = youLayerRef.current;
    if (!ready || !L || !map || !youGroup) return;

    youGroup.clearLayers();
    if (!userLocation) return;

    const at: [number, number] = [userLocation.latitude, userLocation.longitude];

    // The ring is the browser's own accuracy estimate, drawn because a dot alone claims
    // a precision a phone indoors does not have.
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

    // Once, and wherever it lands. This used to hold for interactive maps only, reading
    // the preview's stillness as a view worth protecting — but a map that cannot be
    // dragged has no view of its own to protect, and the one it was given was a guess
    // made before anybody had said anything. Flown where flying means something and set
    // where it does not: a second of gliding across a still life behind two cards is
    // motion nobody asked for.
    if (!centredRef.current) {
      centredRef.current = true;
      const close = Math.max(zoom, 13);
      if (interactive) map.flyTo(at, close, { duration: 1.2 });
      else map.setView(at, close);
    }
  }, [ready, userLocation, interactive, zoom, leafletRef, leafletMapRef, youLayerRef, centredRef]);
}
