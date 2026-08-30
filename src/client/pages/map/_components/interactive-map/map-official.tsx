import type { MapVet, OsmClinic } from '@/components/map-prof-vet';
import type { MapUserLocation } from '@/components/vetmap';
import MapModal from './map-modals';
import MapPreview from './map-preview';

type Props = {
  vets: MapVet[];
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
