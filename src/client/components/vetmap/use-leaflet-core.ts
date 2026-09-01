import { useEffect, useRef, useState } from 'react';
import { BASEMAP_ATTRIBUTION, basemapUrl } from '../basemap';

interface LeafletCoreOptions {
  mapRef: React.RefObject<HTMLDivElement | null>;
  center: [number, number];
  zoom: number;
  interactive: boolean;
  onReady?: () => void;
}

export function useLeafletCore({ mapRef, center, zoom, interactive, onReady }: LeafletCoreOptions) {
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const clinicLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const vetLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const youLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const centredRef = useRef(false);
  const initialRef = useRef({ center, zoom, interactive, onReady });

  useEffect(() => {
    initialRef.current = { center, zoom, interactive, onReady };
  }, [center, zoom, interactive, onReady]);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

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

      const start = initialRef.current;
      const map = L.map(mapRef.current, {
        center: start.center,
        zoom: start.zoom,
        zoomControl: start.interactive,
        scrollWheelZoom: start.interactive,
        doubleClickZoom: start.interactive,
        dragging: start.interactive,
        attributionControl: false,
      });

      leafletRef.current = L;
      leafletMapRef.current = map;

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
      const clusters = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      }) as import('leaflet').LayerGroup;

      clinicLayerRef.current = clusters;
      map.addLayer(clusters);
      vetLayerRef.current = L.layerGroup().addTo(map);
      youLayerRef.current = L.layerGroup().addTo(map);
      if (!cancelled) {
        setReady(true);
        start.onReady?.();
      }
    }

    init();

    return () => {
      cancelled = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      leafletRef.current = null;
      clinicLayerRef.current = null;
      vetLayerRef.current = null;
      youLayerRef.current = null;
      centredRef.current = false;
      setReady(false);
    };
  }, [mapRef]);
  const [centreLat, centreLng] = center;
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!ready || !map || interactive || centredRef.current) return;

    map.setView([centreLat, centreLng], zoom);
  }, [ready, interactive, centreLat, centreLng, zoom]);

  return {
    ready,
    leafletRef,
    leafletMapRef,
    clinicLayerRef,
    vetLayerRef,
    youLayerRef,
    centredRef,
  };
}
