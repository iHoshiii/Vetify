'use client';

import { useEffect, useRef, useState } from 'react';

interface Clinic {
  id: number;
  lat: number;
  lon: number;
  name: string;
  address?: string;
  phone?: string;
  opening_hours?: string;
}

interface VetMapProps {
  /** Zoom level (default 11) */
  zoom?: number;
  /** Centre coordinates — Nueva Vizcaya centroid */
  center?: [number, number];
  /** Extra class names for the wrapper div */
  className?: string;
  /** Show the loading / error overlay */
  showOverlay?: boolean;
}

// Overpass query: veterinary amenities in Nueva Vizcaya bounding box
// bbox order: south, west, north, east
const OVERPASS_URL =
  'https://overpass-api.de/api/interpreter?data=' +
  encodeURIComponent(`
[out:json][timeout:25];
(
  node["amenity"="veterinary"](15.5,120.6,17.0,121.5);
  way["amenity"="veterinary"](15.5,120.6,17.0,121.5);
  node["amenity"="animal_shelter"](15.5,120.6,17.0,121.5);
  node["shop"="veterinary"](15.5,120.6,17.0,121.5);
);
out center;
`);

// Custom SVG paw-pin marker
function createMarkerIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
    html: `
      <div style="
        position:relative;
        width:36px;
        height:44px;
        filter: drop-shadow(0 4px 8px rgba(37,99,235,0.35));
      ">
        <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="44">
          <!-- Pin body -->
          <path d="M18 2C10.268 2 4 8.268 4 16c0 9.941 14 26 14 26S32 25.941 32 16C32 8.268 25.732 2 18 2z"
            fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>
          <!-- White circle background for paw -->
          <circle cx="18" cy="15" r="9" fill="white" opacity="0.95"/>
          <!-- Paw icon (simplified) -->
          <g fill="#2563eb">
            <!-- Main pad -->
            <ellipse cx="18" cy="17" rx="3.5" ry="2.8"/>
            <!-- Toe pads -->
            <ellipse cx="13.5" cy="14.5" rx="2" ry="1.5"/>
            <ellipse cx="22.5" cy="14.5" rx="2" ry="1.5"/>
            <ellipse cx="15.5" cy="11.5" rx="1.8" ry="1.4"/>
            <ellipse cx="20.5" cy="11.5" rx="1.8" ry="1.4"/>
          </g>
        </svg>
      </div>
    `,
  });
}

export default function VetMap({
  zoom = 11,
  center = [16.32, 121.1],
  className = '',
  showOverlay = true,
}: VetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<import('leaflet').Map | null>(null);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [clinicCount, setClinicCount] = useState(0);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;

      // Patch default icon paths (Next.js asset issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      leafletMap.current = map;

      // Tile layer — CartoDB Positron (light, minimal, vet-clinic friendly)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Label layer on top (shows city/road labels clearly)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(map);

      const icon = createMarkerIcon(L);

      try {
        const res = await fetch(OVERPASS_URL);
        if (!res.ok) throw new Error('Overpass fetch failed');
        const data = await res.json();

        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements: any[] = data.elements ?? [];
        const clinics: Clinic[] = elements.map((el) => ({
          id: el.id,
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
          name: el.tags?.name ?? el.tags?.['name:en'] ?? 'Unnamed Vet Clinic',
          address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
            .filter(Boolean)
            .join(' '),
          phone: el.tags?.phone ?? el.tags?.['contact:phone'],
          opening_hours: el.tags?.opening_hours,
        }));

        setClinicCount(clinics.length);

        if (clinics.length === 0) {
          // No OSM data — show a single labelled placeholder marker
          const placeholder: Clinic = {
            id: 0,
            lat: center[0],
            lon: center[1],
            name: 'Nueva Vizcaya Vet Services',
            address: 'Bayombong, Nueva Vizcaya',
          };
          clinics.push(placeholder);
        }

        clinics.forEach((clinic) => {
          if (clinic.lat == null || clinic.lon == null) return;

          const marker = L.marker([clinic.lat, clinic.lon], { icon });

          // Permanent label (tooltip always visible)
          marker.bindTooltip(clinic.name, {
            permanent: true,
            direction: 'top',
            offset: [0, -46],
            className: 'vet-label',
          });

          // Click popup with details
          const addressHtml = clinic.address
            ? `<p style="margin:4px 0 0;color:#64748b;font-size:12px;">${clinic.address}</p>`
            : '';
          const phoneHtml = clinic.phone
            ? `<p style="margin:4px 0 0;color:#64748b;font-size:12px;">📞 ${clinic.phone}</p>`
            : '';
          const hoursHtml = clinic.opening_hours
            ? `<p style="margin:4px 0 0;color:#64748b;font-size:12px;">🕐 ${clinic.opening_hours}</p>`
            : '';

          marker.bindPopup(
            `<div style="font-family:system-ui,sans-serif;min-width:160px;">
              <p style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${clinic.name}</p>
              ${addressHtml}${phoneHtml}${hoursHtml}
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">🐾 Veterinary Clinic</p>
            </div>`,
            { maxWidth: 260 }
          );

          marker.addTo(map);
        });

        setStatus('done');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    init();

    return () => {
      cancelled = true;
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />

      {/* Custom label styles */}
      <style>{`
        .vet-label {
          background: white !important;
          border: 1px solid #bfdbfe !important;
          border-radius: 8px !important;
          padding: 3px 8px !important;
          font-family: system-ui, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #1e40af !important;
          white-space: nowrap !important;
          box-shadow: 0 2px 8px rgba(37,99,235,0.15) !important;
          pointer-events: none !important;
        }
        .vet-label::before {
          display: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important;
          border: 1px solid #e2e8f0 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
      `}</style>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* Loading / error overlay */}
      {showOverlay && status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-50/80 backdrop-blur-sm pointer-events-none">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="mt-3 text-sm font-semibold text-blue-700">Loading vet clinics…</p>
        </div>
      )}

      {showOverlay && status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/80 backdrop-blur-sm pointer-events-none">
          <p className="text-sm font-semibold text-red-600">
            ⚠️ Could not load clinic data. Check your connection.
          </p>
        </div>
      )}

      {/* Clinic count badge */}
      {status === 'done' && clinicCount > 0 && (
        <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-full bg-white/95 border border-blue-100 shadow-md text-xs font-bold text-blue-700 backdrop-blur-sm pointer-events-none">
          🐾 {clinicCount} vet clinic{clinicCount !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
