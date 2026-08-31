import type { MapVet, OsmClinic } from './map-prof-vet';

export type MapUserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export interface VetMapProps {
  zoom?: number;
  center?: [number, number];
  className?: string;
  showOverlay?: boolean;
  interactive?: boolean;
  clinics?: OsmClinic[];
  clinicsLoading?: boolean;
  clinicsFailed?: boolean;
  onReady?: () => void;
  vets?: MapVet[];
  userLocation?: MapUserLocation | null;
  onNavigate?: (path: string) => void;
}
