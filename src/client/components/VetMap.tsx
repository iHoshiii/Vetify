import { useEffect, useMemo, useRef, useState } from 'react';

import { BASEMAP_ATTRIBUTION, basemapUrl } from './basemap';
import { createMarkerIcon, OSM_PALETTE, POPUP_ANCHOR, VETIFY_PALETTE } from './marker-icon';
import { formatDistance, isSamePlace, type MapVet, type OsmClinic } from './map-vets';

/** Where the person reading the map is, as their own browser reported it. */
export type MapUserLocation = {
  latitude: number;
  longitude: number;
  /** The browser's estimate, drawn as a circle. Absent when it did not offer one. */
  accuracyMeters?: number | null;
};

interface VetMapProps {
  zoom?: number;
  center?: [number, number];
  className?: string;
  showOverlay?: boolean;
  /** If false, disables all map interactions (zooming, dragging, clicking pins) */
  interactive?: boolean;
  /**
   * OpenStreetMap's clinics, fetched by the page rather than by the map.
   *
   * It used to fetch them itself, into private state, which meant the panel beside it
   * could not rank what the map was showing. The owner is now
   * `useOsmClinics`, and a map with none passed simply draws none — which is what the
   * preview beside the hero wants, and what the `fetchData={false}` prop used to say.
   */
  clinics?: OsmClinic[];
  /** That query in flight, and having failed: both are somebody else's news now. */
  clinicsLoading?: boolean;
  clinicsFailed?: boolean;
  /** Callback fired when the map itself is up. */
  onReady?: () => void;
  /**
   * Vetify's own verified vets, one entry per address a vet chose to publish.
   *
   * Arrives from a query, so it is usually empty on the first render and full on a
   * later one. That is the whole reason the markers live in an effect of their own
   * rather than in the one that builds the map.
   */
  vets?: MapVet[];
  /** Drawn as a dot and an accuracy ring, and flown to once when the map is interactive. */
  userLocation?: MapUserLocation | null;
  /**
   * Where a link inside a Vetify popup should send the reader.
   *
   * This stands in for the marker-click callback the plan named. The click worth acting
   * on is on a link inside the popup rather than on the pin itself, and a popup built
   * from an HTML string — which is what Leaflet takes — cannot hold a router `Link`.
   * Given this, those anchors are handed to the router; without it they navigate the
   * ordinary way, and a modified click always does.
   */
  onNavigate?: (path: string) => void;
}

/**
 * Names typed by somebody else, made safe to put in an HTML string.
 *
 * Both popups are built as markup because that is what Leaflet's `bindPopup` takes, and
 * both carry text this application did not write — OpenStreetMap tags on one side, a
 * vet's own profile on the other. The clinic half was interpolating them raw.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** How the three availability values read to somebody who is not a vet. */
const AVAILABILITY_WORDS: Record<string, string> = {
  available: 'Taking bookings',
  busy: 'Booked up at the moment',
  unavailable: 'Not taking bookings',
};

const EXTERNAL_LINK_ICON =
  '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>';

/** A clinic scraped from OpenStreetMap: what the tags said, and a way out to Maps. */
function clinicPopupHtml(clinic: OsmClinic): string {
  const line = (text: string) =>
    `<p style="margin:4px 0 0;color:#64748b;font-size:12px;">${text}</p>`;

  const details = [
    clinic.address ? line(escapeHtml(clinic.address)) : '',
    clinic.phone ? line(`📞 ${escapeHtml(clinic.phone)}`) : '',
    clinic.openingHours ? line(`🕐 ${escapeHtml(clinic.openingHours)}`) : '',
  ].join('');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;

  return `<div style="font-family:system-ui,sans-serif;min-width:180px;padding-bottom:4px;">
              <p style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${escapeHtml(
                clinic.name
              )}</p>
              ${details}
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;">🐾 Vet Clinic</p>
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:700;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                  Open in Maps
                  ${EXTERNAL_LINK_ICON}
                </a>
              </div>
            </div>`;
}

/**
 * A Vetify vet: what a stranger came to the map for, and the two links only we have.
 *
 * The distance is shown when the pin arrived from a ranked answer and left out when it
 * did not, rather than computed here — a number the server did not calculate would be a
 * second definition of "how far away".
 */
function vetPopupHtml(vet: MapVet): string {
  const heading = escapeHtml(vet.clinicName ?? vet.name);
  const subheading = vet.clinicName ? escapeHtml(vet.name) : null;

  const rows = [
    subheading
      ? `<p style="margin:2px 0 0;color:#475569;font-size:12px;font-weight:600;">${subheading}</p>`
      : '',
    `<p style="margin:6px 0 0;color:#64748b;font-size:12px;">${escapeHtml(vet.addressLine)}</p>`,
    vet.specialties.length
      ? `<p style="margin:6px 0 0;color:#0f766e;font-size:11px;font-weight:700;">${escapeHtml(
          vet.specialties.slice(0, 3).join(' · ')
        )}</p>`
      : '',
    `<p style="margin:6px 0 0;color:#64748b;font-size:12px;">₱${vet.hourlyRate} an hour · ${
      AVAILABILITY_WORDS[vet.availabilityStatus] ?? 'Taking bookings'
    }</p>`,
    vet.distanceMeters === undefined
      ? ''
      : `<p style="margin:6px 0 0;color:#0f766e;font-size:12px;font-weight:700;">${formatDistance(
          vet.distanceMeters
        )} away</p>`,
  ].join('');

  const link = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" data-spa style="font-size:11px;font-weight:700;text-decoration:none;padding:6px 10px;border-radius:8px;${
      primary
        ? 'background:#0f766e;color:#ffffff;'
        : 'background:#f1f5f9;color:#0f766e;border:1px solid #cbd5e1;'
    }">${label}</a>`;

  return `<div style="font-family:system-ui,sans-serif;min-width:200px;padding-bottom:4px;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#0f766e;">✓ Verified on Vetify</p>
              <p style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${heading}</p>
              ${rows}
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:6px;">
                ${link(`/book-appointment?professional=${vet.id}`, 'Book', true)}
                ${link(`/professionals/${vet.id}`, 'Profile', false)}
              </div>
            </div>`;
}

/**
 * Makes the two links inside a Vetify popup navigate without reloading the page.
 *
 * The anchors carry real `href`s, because open-in-a-new-tab and middle click have to
 * keep working; this hands a plain left click to the router instead, and only when the
 * map was given somewhere to send it.
 */
function interceptLinks(
  root: HTMLElement | null | undefined,
  navigate?: (path: string) => void
): void {
  if (!root || !navigate) return;

  root.querySelectorAll<HTMLAnchorElement>('a[data-spa]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      navigate(anchor.getAttribute('href') ?? '');
    });
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
  const leafletMap = useRef<import('leaflet').Map | null>(null);
  /** The module, kept because the marker effects run long after the import awaited. */
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  /** Overpass's clinics, clustered. */
  const clinicLayer = useRef<import('leaflet').LayerGroup | null>(null);
  /** Vetify's own pins, deliberately not. */
  const vetLayer = useRef<import('leaflet').LayerGroup | null>(null);
  /** The reader's own position. */
  const youLayer = useRef<import('leaflet').LayerGroup | null>(null);

  /**
   * Whether the map exists yet.
   *
   * State rather than a ref, and that is the point: it is what re-runs the marker
   * effects once the dynamic import has finished, in the case where the pins were
   * already in hand before the map was.
   */
  const [ready, setReady] = useState(false);

  /**
   * Whether the map has been moved to the reader's own position yet.
   *
   * A ref, because re-centring must happen once: a later, better fix arriving should not
   * yank the map away from somebody who has since panned it somewhere of their own.
   */
  const centred = useRef(false);

  /** Read through a ref so a fresh callback identity does not rebuild every marker. */
  const navigate = useRef(onNavigate);
  // Declared before the marker effect, so it is already current when that one runs.
  useEffect(() => {
    navigate.current = onNavigate;
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

  // ── The map itself, built once. ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');

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
        // Off here and added by hand below, because the default control carries
        // Leaflet's own name as a prefix — that credits the library, and the credit
        // CARTO's free tier is given in exchange for belongs to the tiles and the data.
        attributionControl: false,
      });

      leaflet.current = L;
      leafletMap.current = map;

      L.control.attribution({ prefix: false }).addTo(map);

      L.tileLayer(basemapUrl('land'), {
        attribution: BASEMAP_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.tileLayer(basemapUrl('labels'), {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(map);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clinicLayer.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      });
      map.addLayer(clinicLayer.current!);

      // Added after the cluster and left unclustered on purpose: a bookable vet folded
      // into a badge counting scraped nodes is a pin nobody can find.
      vetLayer.current = L.layerGroup().addTo(map);
      youLayer.current = L.layerGroup().addTo(map);

      // Both layers exist now, so the marker effects have somewhere to put things.
      // Announced in the same breath: this component's own job is finished here, and
      // whether anybody is still fetching clinics is not its news to break.
      if (!cancelled) {
        setReady(true);
        onReady?.();
      }
    }

    init();

    return () => {
      cancelled = true;
      leafletMap.current?.remove();
      leafletMap.current = null;
      leaflet.current = null;
      clinicLayer.current = null;
      vetLayer.current = null;
      youLayer.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── The pins, refilled whenever either source changes. ──────────────────────
  //
  // A second effect rather than lines inside the first, which returns early the moment
  // `leafletMap.current` is set and has to keep doing so. Both sources are asynchronous
  // and neither waits for the other: the clinics come from Overpass, the vets from a
  // query that may answer before the map is built or long after.
  useEffect(() => {
    const L = leaflet.current;
    const clinicGroup = clinicLayer.current;
    const vetGroup = vetLayer.current;
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
        interceptLinks(popup.getElement(), navigate.current);
      });

      vetGroup.addLayer(marker);
    });
  }, [ready, visibleClinics, vets]);

  // ── Where the reader is. ────────────────────────────────────────────────────
  //
  // A dot and a ring rather than the paw pin. The pin means "a clinic is here", and
  // borrowing it for somebody's own position would say something untrue.
  useEffect(() => {
    const L = leaflet.current;
    const map = leafletMap.current;
    const youGroup = youLayer.current;
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

    // Once, and only where the map is something you can pan back from: the preview
    // beside the hero is meant to keep the view it was given.
    if (interactive && !centred.current) {
      centred.current = true;
      map.flyTo(at, Math.max(zoom, 13), { duration: 1.2 });
    }
  }, [ready, userLocation, interactive, zoom]);

  /** What is on the map at all — ours plus whatever survived the dedup. */
  const pinCount = visibleClinics.length + vets.length;

  /**
   * Whether there is anything left to wait for.
   *
   * Two things now, and only one of them is this component's: the map has to exist, and
   * the clinics have to have arrived from the page above. The skeleton still covers the
   * second, because a map that fades in and then sprouts six hundred markers reads as
   * broken — but a failed Overpass is reported as the clinic failure it is, over a
   * basemap and Vetify's own pins that are both perfectly fine.
   */
  const settled = ready && !clinicsLoading && !clinicsFailed;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
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
        .vetify-label {
          border-color: #99f6e4 !important;
          color: #0f766e !important;
          box-shadow: 0 2px 8px rgba(15,118,110,0.18) !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important;
          border: 1px solid #e2e8f0 !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        
        /* Custom Marker Cluster Styles */
        .marker-cluster-small { background-color: rgba(191, 219, 254, 0.6) !important; }
        .marker-cluster-small div { background-color: rgba(59, 130, 246, 0.8) !important; color: white; font-weight: bold; }
        .marker-cluster-medium { background-color: rgba(147, 197, 253, 0.6) !important; }
        .marker-cluster-medium div { background-color: rgba(37, 99, 235, 0.9) !important; color: white; font-weight: bold; }
        .marker-cluster-large { background-color: rgba(96, 165, 250, 0.6) !important; }
        .marker-cluster-large div { background-color: rgba(29, 78, 216, 0.9) !important; color: white; font-weight: bold; }
      `}</style>

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
