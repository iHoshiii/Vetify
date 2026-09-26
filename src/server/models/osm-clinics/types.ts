export type OsmClinic = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  openingHours?: string;
};

export type OsmClinicCacheDocument = {
  _id: 'philippines';
  clinics: OsmClinic[];
  refreshedAt: Date;
};
