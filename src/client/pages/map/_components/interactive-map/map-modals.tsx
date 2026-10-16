import type { MapVet, OsmClinic } from '@/components/map-prof-vet';
import type { MapUserLocation } from '@/components/vetmap';
import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const VetMap = lazy(() => import('@/components/vetmap'));

interface MapModalProps {
  onClose: () => void;
  vets: MapVet[];
  clinics: OsmClinic[];
  clinicsLoading: boolean;
  clinicsFailed: boolean;
  userLocation: MapUserLocation | null;
}

export default function MapModal({
  onClose,
  vets,
  clinics,
  clinicsLoading,
  clinicsFailed,
  userLocation,
}: MapModalProps) {
  const navigate = useNavigate();

  // Freeze the page behind the overlay and keep keyboard focus inside it while the map is open
  useBodyScrollLock();
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md"
        style={{ animation: 'fadeIn 0.2s ease both' }}
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Map of nearby vets and clinics"
          tabIndex={-1}
          className="relative flex w-full h-full flex-col outline-none xl:block"
          style={{ animation: 'scaleIn 0.25s ease both' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="relative z-[2100] m-3 ml-auto flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-xl text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-150 xl:absolute xl:top-5 xl:right-5 xl:m-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </button>

          <Suspense fallback={null}>
            {/* The whole country when nobody has said where they are, and the map flies
                to them at street level when they have. A link inside a popup goes
                through the router rather than reloading the app, and closes this. */}
            <VetMap
              className="min-h-0 flex-1 xl:flex-none"
              zoom={userLocation ? 13 : 6}
              center={
                userLocation ? [userLocation.latitude, userLocation.longitude] : [12.87, 121.77]
              }
              showOverlay
              vets={vets}
              clinics={clinics}
              clinicsLoading={clinicsLoading}
              clinicsFailed={clinicsFailed}
              userLocation={userLocation}
              onNavigate={(path) => {
                onClose();
                navigate(path);
              }}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
