import type { ProfessionalAvailabilityStatus } from '@shared/limits';
import type { ProfessionalAddressKind } from '@shared/schemas';

import type { NearbyProfessional } from '../services/professionals.service';

/** One map pin: a professional at one of their pinned addresses. */
export type MapVet = {
  id: string;
  key: string;
  kind: ProfessionalAddressKind;
  name: string;
  clinicName: string | null;
  addressLine: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  distanceMeters?: number;
};

/** A clinic sourced from OpenStreetMap rather than our own directory. */
export type OsmClinic = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  openingHours?: string;
};

/** A ranked nearby result, tagged by where it came from. */
export type NearbyPlace =
  | { source: 'vetify'; key: string; distanceMeters: number; vet: NearbyProfessional }
  | { source: 'osm'; key: string; distanceMeters: number; clinic: OsmClinic };
