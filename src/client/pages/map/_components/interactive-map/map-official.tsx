import type { MapUserLocation } from '@/components/vetmap';
import type { MapVet, OsmClinic } from '@/components/map-prof-vet';
import MapModal from './map-modals';
import MapPreview from './map-preview';

/**
 * The map column, and the full-screen map it opens.
 *
 * Whether it is open is the page's state rather than this component's, and the modal is
 * a sibling of the column rather than a child of it. The column is `hidden lg:block`,
 * so a modal nested inside it could only ever be opened — and rendered — on a desktop;
 * lifting both out is what lets the phone-only button in the hero open the same map.
 */
type Props = {
  vets: MapVet[];
  /**
   * OpenStreetMap's clinics, for the full-screen map only.
   *
   * The preview is a still life behind two cards at 60% opacity, so six hundred more
   * markers on it would be six hundred nobody can read. The page owns the query either
   * way, because the list beside the hero ranks the same clinics.
   */
  clinics: OsmClinic[];
  clinicsLoading: boolean;
  clinicsFailed: boolean;
  userLocation: MapUserLocation | null;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
};

export default function InteractiveMap({
  vets,
  clinics,
  clinicsLoading,
  clinicsFailed,
  userLocation,
  expanded,
  onExpand,
  onClose,
}: Props) {
  return (
    <>
      <div className="hidden lg:block flex-shrink-0 w-[400px] xl:w-[480px]">
        <MapPreview onExpand={onExpand} vets={vets} userLocation={userLocation} />
      </div>

      {expanded && (
        <MapModal
          onClose={onClose}
          vets={vets}
          clinics={clinics}
          clinicsLoading={clinicsLoading}
          clinicsFailed={clinicsFailed}
          userLocation={userLocation}
        />
      )}
    </>
  );
}
