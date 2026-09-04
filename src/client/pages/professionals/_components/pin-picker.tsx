import { BASEMAP_ATTRIBUTION, basemapUrl } from '@/components/basemap';
import { toMapVets } from '@/components/map-prof-vet/to-map-vets';
import { vetLabel } from '@/components/map-prof-vet/vet-label';
import { MapStyles } from '@/components/vetmap/map-styles';
import {
  createMarkerIcon,
  OSM_PALETTE,
  VETIFY_PALETTE,
  type MarkerGlyph,
} from '@/components/marker-icon';
import { useOsmClinics } from '@/hooks/useOsmClinics';
import { useProfessionals } from '@/hooks/useProfessionals';
import { Crosshair, MapPin } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLiveFix } from './address-fields';

/**
 * Dropping a pin on the exact spot, the way a delivery app asks for it.
 *
 * Its own component rather than a mode on `VetMap`, which is a read-only viewer whose
 * whole lifecycle sits in one effect that returns early if a map already exists. Bending
 * that into an editor would make both jobs harder to follow. What the two do share is the
 * marker: it comes from the same `createMarkerIcon`, so the pin a vet drags into place is
 * literally the pin a stranger will see.
 *
 * Controlled. The page above owns the coordinate, because it is the thing being saved and
 * the switch beside it has to know whether one exists yet.
 */

export type Point = { latitude: number; longitude: number };

/** Roughly the middle of the country, for a marker with nowhere better to start. */
const PHILIPPINES: Point = { latitude: 12.87, longitude: 121.77 };

/** Close enough to see a building; the country view when there is no point yet. */
const PLACED_ZOOM = 17;
const UNPLACED_ZOOM = 6;

type Props = {
  /** Where the marker is. Null until the vet has placed one. */
  value: Point | null;
  onChange: (point: Point) => void;
  /**
   * Where to open when there is no pin yet — in practice the reading taken at this
   * address during verification, which is usually right already, so the vet confirms
   * rather than hunts.
   */
  fallback?: Point | null;
  className?: string;
  // Which address is being pinned, so the pin carries a house or a cross to match.
  kind?: MarkerGlyph;
  autoLocate?: boolean;
  hideReadout?: boolean;
  onReady?: () => void;
};

export default function PinPicker({
  value,
  onChange,
  fallback = null,
  className = '',
  kind = 'clinic',
  autoLocate = false,
  hideReadout = false,
  onReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const marker = useRef<import('leaflet').Marker | null>(null);
  const autoStarted = useRef(false);
  const readyCallback = useRef(onReady);
  const referenceMarkers = useRef<import('leaflet').Layer[]>([]);
  const referenceCluster = useRef<import('leaflet').LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Match /map: show every published professional pin, not only vets taking bookings.
  const directory = useProfessionals({ limit: 20 });
  const clinics = useOsmClinics(true);

  /** Read through refs, so a new callback identity does not rebuild the map. */
  const change = useRef(onChange);
  const seed = useRef<Point | null>(value ?? fallback);
  const glyph = useRef(kind);
  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);

  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

  const place = useCallback((point: Point, zoom?: number) => {
    change.current(point);
    marker.current?.setLatLng([point.latitude, point.longitude]);
    if (map.current) map.current.setView([point.latitude, point.longitude], zoom ?? PLACED_ZOOM);
  }, []);

  /**
   * The device, for the vet who is standing at the door.
   *
   * The applicant's tracker verbatim: `watchPosition` at high accuracy, stopping once the
   * reading is good enough. This is the one place in the product where a coarse fix is
   * not good enough, because the number being saved is a doorway.
   */
  const { tracking, accuracy, message, start } = useLiveFix(
    (fix) => place({ latitude: fix.latitude, longitude: fix.longitude }, 18),
    true
  );

  useEffect(() => {
    if (!autoLocate) {
      autoStarted.current = false;
      return;
    }
    if (!autoStarted.current) {
      autoStarted.current = true;
      start();
    }
  }, [autoLocate, start]);

  // ── The map, once. ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hostRef.current || map.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      if (cancelled || !hostRef.current) return;

      const at = seed.current ?? PHILIPPINES;
      const instance = L.map(hostRef.current, {
        center: [at.latitude, at.longitude],
        zoom: seed.current ? PLACED_ZOOM : UNPLACED_ZOOM,
        // Added by hand below without Leaflet's own name as a prefix, the same way the
        // public map does it — this is the same basemap, so it owes the same credit.
        attributionControl: false,
      });
      L.control.attribution({ prefix: false }).addTo(instance);

      L.tileLayer(basemapUrl('land'), {
        attribution: BASEMAP_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(instance);
      L.tileLayer(basemapUrl('labels'), {
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(instance);

      const pin = L.marker([at.latitude, at.longitude], {
        icon: createMarkerIcon(L, VETIFY_PALETTE, glyph.current),
        draggable: true,
        keyboard: true,
      }).addTo(instance);

      // Two ways to move it, because both are habits people already have: drag the pin,
      // or tap the spot. Neither re-centres — yanking the map under a finger that just
      // dragged something is how a picker feels broken.
      pin.on('dragend', () => {
        const { lat, lng } = pin.getLatLng();
        change.current({ latitude: lat, longitude: lng });
      });
      instance.on('click', (event) => {
        const { lat, lng } = (event as import('leaflet').LeafletMouseEvent).latlng;
        pin.setLatLng([lat, lng]);
        change.current({ latitude: lat, longitude: lng });
      });

      map.current = instance;
      marker.current = pin;
      setMapReady(true);

      // The container is frequently laid out after this runs — inside a card that was
      // still measuring — and a Leaflet map sized against a zero-height div renders grey.
      setTimeout(() => instance.invalidateSize(), 0);
    }

    init();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current) return;
    let cancelled = false;
    void import('leaflet').then(async ({ default: L }) => {
      await import('leaflet.markercluster');
      if (cancelled || !map.current) return;
      referenceCluster.current?.remove();
      const leafletWithClusters = L as typeof L & {
        markerClusterGroup?: () => import('leaflet').LayerGroup;
      };
      const cluster = leafletWithClusters.markerClusterGroup
        ? leafletWithClusters.markerClusterGroup()
        : L.layerGroup();
      cluster.addTo(map.current);
      const clinicIcon = createMarkerIcon(L, OSM_PALETTE, 'clinic');
      const vets = toMapVets(directory.data?.items ?? []);
      const vetMarkers = vets.map((vet) =>
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
      referenceMarkers.current = [...vetMarkers, ...clinicMarkers];
      referenceMarkers.current.forEach((marker) => cluster.addLayer(marker));
      referenceCluster.current = cluster;
      if (directory.isFetched && clinics.isFetched) readyCallback.current?.();
    });
    return () => {
      cancelled = true;
    };
  }, [clinics.data, clinics.isFetched, directory.data, directory.isFetched, mapReady]);

  // A pin cleared or replaced from outside — a reset, or another card saving — has to
  // move the marker too, or the readout and the map would disagree.
  useEffect(() => {
    if (!value || !marker.current) return;
    const at = marker.current.getLatLng();
    if (at.lat === value.latitude && at.lng === value.longitude) return;
    marker.current.setLatLng([value.latitude, value.longitude]);
  }, [value]);

  return (
    <div className={`space-y-2 ${className}`}>
      <MapStyles />
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

      <div className="relative min-h-[28rem] w-full overflow-hidden rounded-xl border border-slate-200 sm:h-[68vh] sm:min-h-[32rem]">
        <div ref={hostRef} className="absolute inset-0" />

        <button
          type="button"
          onClick={start}
          disabled={tracking}
          className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-bold text-teal-800 shadow-md ring-1 ring-slate-200 backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-60"
        >
          <Crosshair className={`h-3.5 w-3.5 ${tracking ? 'animate-spin' : ''}`} />
          {tracking ? 'Reading…' : 'Use my current location'}
        </button>
      </div>

      {/* The readout is the point of the exercise: the vet can see the thing that will
          be published, and six decimal places is about a tenth of a metre — enough that
          nudging the pin visibly changes the number. */}
      {!hideReadout && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-700">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700" />
            {value
              ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
              : 'No pin yet — tap the map or drag the marker'}
          </span>
          {tracking && accuracy !== null && (
            <span className="font-semibold text-slate-500">accurate to about {accuracy} m</span>
          )}
        </div>
      )}

      {message && <p className="text-xs font-semibold text-rose-700">{message}</p>}
    </div>
  );
}
