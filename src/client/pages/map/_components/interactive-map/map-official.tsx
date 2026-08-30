import type { MapUserLocation } from '@/components/VetMap';
import type { MapVet } from '@/components/map-vets';
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
  userLocation: MapUserLocation | null;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
};

export default function InteractiveMap({ vets, userLocation, expanded, onExpand, onClose }: Props) {
  return (
    <>
      <div className="hidden lg:block flex-shrink-0 w-[400px] xl:w-[480px]">
        <MapPreview onExpand={onExpand} vets={vets} userLocation={userLocation} />
      </div>

      {expanded && <MapModal onClose={onClose} vets={vets} userLocation={userLocation} />}
    </>
  );
}
