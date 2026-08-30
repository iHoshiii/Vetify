/**
 * Leaflet's own stylesheets, and the label, popup and cluster looks layered over them.
 *
 * A fragment rather than a global stylesheet: the map is loaded on demand, and these
 * are the rules only it uses.
 */
export function MapStyles() {
  return (
    <>
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
    </>
  );
}
