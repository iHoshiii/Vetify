import type { MapUserLocation } from '@/components/VetMap';
import { formatDistance, type MapVet } from '@/components/map-vets';
import { Suspense, lazy, useState } from 'react';

const VetMap = lazy(() => import('@/components/VetMap'));

interface MapPreviewProps {
  onExpand: () => void;
  vets: MapVet[];
  userLocation: MapUserLocation | null;
}

/** Availability as a card has room to say it. */
const OPEN_WORDS: Record<MapVet['availabilityStatus'], string> = {
  available: 'Taking bookings',
  busy: 'Booked up',
  unavailable: 'Not taking bookings',
};

/**
 * The two cards floating over the preview.
 *
 * They used to be hard-coded — "Happy Paws Clinic ⭐️ 4.9 (120 reviews)" and a
 * "1.2 km away" nothing had measured — which is exactly what this feature makes real, so
 * they now hold the first two vets on the map. Ranked ones when a location has been
 * shared, and simply the first two published pins when it has not. If there are none,
 * there is nothing to float: an invented clinic in a shop window is worse than an empty
 * one.
 */
function FloatingVetCard({
  vet,
  emoji,
  tone,
  position,
  className = '',
}: {
  vet: MapVet;
  emoji: string;
  tone: string;
  position: string;
  className?: string;
}) {
  const distance = vet.distanceMeters === undefined ? null : formatDistance(vet.distanceMeters);

  return (
    <div
      className={`absolute ${position} z-20 flex items-center gap-3 rounded-2xl border border-white bg-white/95 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105 ${className}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-xl shadow-inner ${tone}`}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <p className="max-w-[10rem] truncate text-xs font-bold text-slate-800">
          {vet.clinicName ?? vet.name}
        </p>
        <p className="text-[10px] font-semibold text-teal-600">
          {OPEN_WORDS[vet.availabilityStatus]}
          {distance && <span className="font-normal text-slate-400"> • {distance} away</span>}
        </p>
      </div>
    </div>
  );
}

export default function MapPreview({ onExpand, vets, userLocation }: MapPreviewProps) {
  const [previewReady, setPreviewReady] = useState(false);
  const [first, second] = vets;

  return (
    <>
      <div
        onClick={onExpand}
        style={{ aspectRatio: '1 / 1' }}
        className="relative w-full cursor-pointer rounded-[2.5rem] overflow-hidden border border-blue-900/10 bg-white shadow-2xl shadow-blue-900/8 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.2)] hover:-translate-y-2 hover:border-blue-400/40 group"
      >
        {/* Decorative gradient frame */}
        <div className="absolute inset-0 z-30 rounded-[2.5rem] ring-1 ring-inset ring-white/20 pointer-events-none" />

        {/* Floating UI Elements */}
        <div
          className={`transition-opacity duration-700 ${
            previewReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {first && (
            <FloatingVetCard vet={first} emoji="🐕" tone="bg-blue-100" position="top-8 left-8" />
          )}

          {second && (
            <FloatingVetCard
              vet={second}
              emoji="🏥"
              tone="bg-teal-100"
              position="bottom-16 right-8"
              className="delay-75"
            />
          )}

          {/* Center "Click to Explore" Badge */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <div className="bg-blue-600/95 text-white px-5 py-3 rounded-full font-bold text-sm shadow-xl backdrop-blur-sm border border-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              Click to Explore Map
            </div>
          </div>
        </div>

        {/* Map Background */}
        <div
          className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-75"
          style={{ isolation: 'isolate', opacity: 0.6 }}
        >
          <Suspense fallback={null}>
            {/* Vetify's own pins and no clinics passed: this is a still behind two
                cards, where six hundred scraped markers would be six hundred nobody
                can read. It centres on whoever is looking once they say. */}
            <VetMap
              zoom={userLocation ? 14 : 15}
              center={
                userLocation ? [userLocation.latitude, userLocation.longitude] : [14.64, 121.05]
              }
              showOverlay={false}
              interactive={false}
              vets={vets}
              userLocation={userLocation}
              onReady={() => setPreviewReady(true)}
            />
          </Suspense>
        </div>
      </div>

      {/* Caption below map */}
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-xs text-slate-400 font-medium">🐾 Vet clinics · Philippines</p>
        <button
          onClick={onExpand}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 transition-colors"
        >
          Open full map →
        </button>
      </div>
    </>
  );
}
