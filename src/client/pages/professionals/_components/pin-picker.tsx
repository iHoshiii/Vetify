import { createMarkerIcon, VETIFY_PALETTE } from '@/components/marker-icon';
import { Crosshair, MapPin } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

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
};

export default function PinPicker({ value, onChange, fallback = null, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const marker = useRef<import('leaflet').Marker | null>(null);

  /** Read through refs, so a new callback identity does not rebuild the map. */
  const change = useRef(onChange);
  const seed = useRef<Point | null>(value ?? fallback);
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
  const { tracking, accuracy, message, start } = useLiveFix((fix) =>
    place({ latitude: fix.latitude, longitude: fix.longitude }, 18)
  );

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
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(instance);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(instance);

      const pin = L.marker([at.latitude, at.longitude], {
        icon: createMarkerIcon(L, VETIFY_PALETTE),
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
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />

      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-200 sm:h-72">
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

      {message && <p className="text-xs font-semibold text-rose-700">{message}</p>}
    </div>
  );
}
