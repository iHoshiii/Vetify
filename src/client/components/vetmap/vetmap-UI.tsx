import { useEffect, useMemo, useRef } from 'react';

import { isSamePlace } from '../map-vets';
import { MapSkeleton } from './map-skeleton';
import { MapStyles } from './map-styles';
import type { VetMapProps } from './types';
import { useLeafletCore } from './use-leaflet-core';
import { useMapMarkers } from './use-map-marker';

/**
 * The map: a container, a skeleton over it, and a badge counting what is on it.
 *
 * Leaflet itself lives in `useLeafletCore`, the pins in `useMapMarkers`, and the popup
 * markup in `map-popup`. What is left here is the part React actually renders, plus the
 * one decision that needs both sources at once — which scraped clinics survive.
 */
export default function VetMap({
  zoom = 11,
  center = [16.32, 121.1],
  className = '',
  showOverlay: _showOverlay = true,
  interactive = true,
  clinics = [],
  clinicsLoading = false,
  clinicsFailed = false,
  onReady,
  vets = [],
  userLocation = null,
  onNavigate,
}: VetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  /** Read through a ref so a fresh callback identity does not rebuild every marker. */
  const navigateRef = useRef(onNavigate);
  // Declared before the marker hook, so it is already current when that one runs.
  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

  /**
   * The scraped clinics worth drawing: all of them, minus the ones a Vetify vet has
   * already pinned.
   *
   * Ours wins, because ours is verified, bookable, and maintained by the person who
   * works there. The badge counts what survives, so the drop shows up as a smaller
   * number rather than as two markers on one building. The same test runs again in
   * `rankNearby` for the list beside the map, so a door dropped here is dropped there.
   */
  const visibleClinics = useMemo(
    () => clinics.filter((clinic) => !vets.some((vet) => isSamePlace(vet, clinic))),
    [clinics, vets]
  );

  const core = useLeafletCore({ mapRef, center, zoom, interactive, onReady });

  useMapMarkers({
    ...core,
    visibleClinics,
    vets,
    userLocation,
    navigateRef,
    interactive,
    zoom,
  });

  /** What is on the map at all — ours plus whatever survived the dedup. */
  const pinCount = visibleClinics.length + vets.length;

  /**
   * Whether there is anything left to wait for.
   *
   * Two things, and only one of them is this component's: the map has to exist, and
   * the clinics have to have arrived from the page above. The skeleton still covers the
   * second, because a map that fades in and then sprouts six hundred markers reads as
   * broken — but a failed Overpass is reported as the clinic failure it is, over a
   * basemap and Vetify's own pins that are both perfectly fine.
   */
  const settled = core.ready && !clinicsLoading && !clinicsFailed;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapStyles />

      {/* ── Skeleton: shown while loading or on error. Sits above map. ── */}
      {!settled && (
        <div className="absolute inset-0" style={{ zIndex: 1100 }}>
          <MapSkeleton error={clinicsFailed} />
        </div>
      )}

      {/* ── Map container: always in DOM (Leaflet needs the element), ──
              but invisible until data is ready so skeleton shows instead ── */}
      <div
        ref={mapRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: settled ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: settled ? 'auto' : 'none',
        }}
      />

      {/* What is on the map, and how much of it is ours */}
      {settled && pinCount > 0 && (
        <div
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white/95 border border-blue-100 shadow-md text-xs font-bold text-blue-700 backdrop-blur-sm pointer-events-none"
          style={{ zIndex: 1100 }}
        >
          {/* Each half only when it has something to report: this map is given its
              clinics now rather than fetching its own, and the preview beside the hero
              is given none at all, so "0 vet clinics" would be a count of nothing. */}
          🐾{' '}
          {visibleClinics.length > 0 && (
            <>
              {visibleClinics.length} vet clinic{visibleClinics.length !== 1 ? 's' : ''}
              {vets.length > 0 && ' · '}
            </>
          )}
          {vets.length > 0 && <span className="text-teal-700">{vets.length} on Vetify</span>}
        </div>
      )}
    </div>
  );
}
