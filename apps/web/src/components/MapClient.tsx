"use client";

import { useEffect, useRef } from "react";

interface Clinic {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface MapClientProps {
  clinics?: Clinic[];
}

export default function MapClient({ clinics = [] }: MapClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Leaflet or Google Maps initialisation goes here
    // import("leaflet").then((L) => { ... })
  }, []);

  return (
    <div
      ref={mapRef}
      id="map-canvas"
      style={{ width: "100%", height: "500px", background: "#e5e7eb" }}
      aria-label="Geospatial vet finder map"
    >
      {/* Map renders here via useEffect */}
    </div>
  );
}
