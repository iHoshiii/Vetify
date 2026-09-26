import { useEffect, useMemo, useRef } from 'react';
import './map.css';

import type { VetMapProps } from '@/types/vetmap';
import { isSamePlace } from '../map-prof-vet';
import { MapSkeleton } from './map-skeleton';
import { useLeafletCore } from './use-leaflet-core';
import { useMapMarkers } from './use-map-marker';

export default function VetMap({
  zoom = 11,
  center = [16.32, 121.1],
  className = '',
  showOverlay = true,
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
  const navigateRef = useRef(onNavigate);
  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

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

  const pinCount = visibleClinics.length + vets.length;
  const settled = core.ready;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* ── Skeleton: shown while loading or on error. Sits above map. ── */}
      {!settled && (
        <div className="absolute inset-0" style={{ zIndex: 1100 }}>
          <MapSkeleton />
        </div>
      )}
      <div
        ref={mapRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: settled ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: settled ? 'auto' : 'none',
        }}
      />
      {settled && showOverlay && pinCount > 0 && (
        <div
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white/95 border border-blue-100 shadow-md text-xs font-bold text-blue-700 backdrop-blur-sm pointer-events-none"
          style={{ zIndex: 1100 }}
        >
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
      {settled && showOverlay && clinicsLoading && (
        <div
          role="status"
          className="pointer-events-none absolute right-3 top-3 rounded-full border border-blue-100 bg-white/95 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-md backdrop-blur-sm"
          style={{ zIndex: 1100 }}
        >
          Loading nearby clinics…
        </div>
      )}
      {settled && showOverlay && clinicsFailed && (
        <div
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/95 border border-amber-100 shadow-md text-xs font-semibold text-amber-700 backdrop-blur-sm pointer-events-none"
          style={{ zIndex: 1100 }}
        >
          Couldn&apos;t load nearby clinics
        </div>
      )}
    </div>
  );
}
