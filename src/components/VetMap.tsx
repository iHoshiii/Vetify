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
  zoom?: number;
  center?: [number, number];
  className?: string;
  showOverlay?: boolean;
  /** If false, disables all map interactions (zooming, dragging, clicking pins) */
  interactive?: boolean;
}

const OVERPASS_QUERY = `
[out:json][timeout:25];
(
  node["amenity"="veterinary"](4.5,116.9,21.4,126.6);
  way["amenity"="veterinary"](4.5,116.9,21.4,126.6);
  node["amenity"="animal_shelter"](4.5,116.9,21.4,126.6);
  node["shop"="veterinary"](4.5,116.9,21.4,126.6);
);
out center;
`;

function createMarkerIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 4px 8px rgba(37,99,235,0.35));">
        <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="44">
          <path d="M18 2C10.268 2 4 8.268 4 16c0 9.941 14 26 14 26S32 25.941 32 16C32 8.268 25.732 2 18 2z"
            fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>
          <circle cx="18" cy="15" r="9" fill="white" opacity="0.95"/>
          <g fill="#2563eb">
            <ellipse cx="18" cy="17" rx="3.5" ry="2.8"/>
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

// ── Skeleton screen shown while Leaflet / Overpass loads ──────────────────────
function MapSkeleton({ error }: { error?: boolean }) {
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl">
          ⚠️
        </div>
        <p className="text-sm font-semibold text-red-500">Could not load clinic data.</p>
        <p className="text-xs text-slate-400">Check your internet connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#f0f4f8] overflow-hidden">
      {/* shimmer keyframe via inline style tag */}
      <style>{`
        @keyframes vet-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .vet-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 600px 100%;
          animation: vet-shimmer 1.6s infinite linear;
        }
      `}</style>

      {/* Fake grid lines mimicking a map */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Fake road lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="38%" x2="100%" y2="42%" stroke="#94a3b8" strokeWidth="6" />
        <line x1="0" y1="65%" x2="100%" y2="60%" stroke="#94a3b8" strokeWidth="3" />
        <line x1="30%" y1="0" x2="35%" y2="100%" stroke="#94a3b8" strokeWidth="5" />
        <line x1="68%" y1="0" x2="65%" y2="100%" stroke="#94a3b8" strokeWidth="3" />
        <line x1="0" y1="20%" x2="55%" y2="15%" stroke="#94a3b8" strokeWidth="2" />
        <line x1="45%" y1="75%" x2="100%" y2="80%" stroke="#94a3b8" strokeWidth="2" />
      </svg>

      {/* Fake shimmer blocks (like map tiles loading) */}
      <div
        className="vet-shimmer absolute"
        style={{ top: '10%', left: '5%', width: '28%', height: '18%', borderRadius: 6 }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '55%',
          left: '60%',
          width: '32%',
          height: '14%',
          borderRadius: 6,
          animationDelay: '0.2s',
        }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '30%',
          left: '40%',
          width: '20%',
          height: '10%',
          borderRadius: 6,
          animationDelay: '0.4s',
        }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '70%',
          left: '10%',
          width: '24%',
          height: '12%',
          borderRadius: 6,
          animationDelay: '0.1s',
        }}
      />

      {/* Fake marker pins */}
      {[
        { top: '38%', left: '32%' },
        { top: '52%', left: '61%' },
        { top: '25%', left: '55%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%,-100%)' }}
        >
          <div
            className="vet-shimmer w-7 h-9 rounded-t-full rounded-b-sm"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
          <div
            className="vet-shimmer mt-1 h-3 rounded-full"
            style={{ width: 56, animationDelay: `${i * 0.15 + 0.1}s` }}
          />
        </div>
      ))}

      {/* Centre card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-blue-100 rounded-2xl px-6 py-5 shadow-xl flex flex-col items-center gap-3 max-w-[220px] text-center">
          {/* Animated paw */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
            <div className="relative w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="#2563eb" className="w-6 h-6">
                <ellipse cx="12" cy="15" rx="4" ry="3.2" />
                <ellipse cx="7" cy="11.5" rx="2.3" ry="1.8" />
                <ellipse cx="17" cy="11.5" rx="2.3" ry="1.8" />
                <ellipse cx="9.5" cy="8" rx="2" ry="1.6" />
                <ellipse cx="14.5" cy="8" rx="2" ry="1.6" />
              </svg>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800 leading-snug">Loading vet locations…</p>
            <p className="text-xs text-slate-400 mt-1">Fetching clinics</p>
          </div>

          {/* Dot progress */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ animation: `vet-shimmer 1.2s ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VetMap({
  zoom = 11,
  center = [16.32, 121.1],
  className = '',
  showOverlay = true,
  interactive = true,
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
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        dragging: interactive,
        attributionControl: false,
      });

      leafletMap.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(map);

      const icon = createMarkerIcon(L);

      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
        });
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
          clinics.push({
            id: 0,
            lat: center[0],
            lon: center[1],
            name: 'Default Vet Services',
            address: 'Philippines',
          });
        }

        clinics.forEach((clinic) => {
          if (clinic.lat == null || clinic.lon == null) return;

          const marker = L.marker([clinic.lat, clinic.lon], { icon });

          marker.bindTooltip(clinic.name, {
            permanent: true,
            direction: 'top',
            offset: [0, -46],
            className: 'vet-label',
          });

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

        if (!cancelled) setStatus('done');
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

      {/* Custom marker / popup styles */}
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
        .vet-label::before { display: none !important; }
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important;
          border: 1px solid #e2e8f0 !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
      `}</style>

      {/* ── Skeleton: shown while loading or on error. Sits above map. ── */}
      {status !== 'done' && (
        <div className="absolute inset-0" style={{ zIndex: 1100 }}>
          <MapSkeleton error={status === 'error'} />
        </div>
      )}

      {/* ── Map container: always in DOM (Leaflet needs the element), ──
              but invisible until data is ready so skeleton shows instead ── */}
      <div
        ref={mapRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: status === 'done' ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: status === 'done' ? (interactive ? 'auto' : 'none') : 'none',
        }}
      />

      {/* Clinic count badge */}
      {status === 'done' && clinicCount > 0 && (
        <div
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white/95 border border-blue-100 shadow-md text-xs font-bold text-blue-700 backdrop-blur-sm pointer-events-none"
          style={{ zIndex: 1100 }}
        >
          🐾 {clinicCount} vet clinic{clinicCount !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
