import type { OwnProfessional, ProfessionalAddressView } from '@/services/professionals.service';
import type { MapVet } from '@/types/map-prof-vet';
import { ExternalLink, Globe2, Info, Lock, Mail, MapPin } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';

import { useConsoleApplication } from './professional-layout';

// Lazily, as everywhere else a map is mounted: Leaflet is large and this is not the page a vet opens daily.
const VetMap = lazy(() => import('@/components/vetmap'));

const SUPPORT_EMAIL = 'support.vetify@gmail.com';

const KIND_COPY: Record<ProfessionalAddressView['kind'], { title: string; blurb: string }> = {
  clinic: {
    title: 'Clinic',
    blurb: 'Where pet owners come to you, and the pin most of them will navigate to.',
  },
  home: {
    title: 'Home',
    blurb: 'On the map only if you dropped a marker here when you enquired.',
  },
};

function addressLine(address: ProfessionalAddressView) {
  return [address.line1, address.city, address.province, address.postalCode]
    .filter(Boolean)
    .join(', ');
}

// One marker, the vet's own, so the map is drawn from the application rather than from a directory lookup.
function ownMarker(application: OwnProfessional, address: ProfessionalAddressView): MapVet[] {
  if (!address.mapPin) return [];

  return [
    {
      id: application.id,
      key: `${application.id}:${address.kind}`,
      kind: address.kind,
      name: application.fullName,
      clinicName: application.clinicName,
      addressLine: addressLine(address),
      latitude: address.mapPin.latitude,
      longitude: address.mapPin.longitude,
      specialties: application.specialties,
      hourlyRate: application.hourlyRate,
      availabilityStatus: application.availabilityStatus,
    },
  ];
}

function AddressMapCard({
  application,
  address,
}: {
  application: OwnProfessional;
  address: ProfessionalAddressView;
}) {
  const copy = KIND_COPY[address.kind];
  const pin = address.mapPin;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900">{copy.title} address</h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">{addressLine(address)}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.blurb}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
            address.showOnMap ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {address.showOnMap ? 'On the map' : 'Not on the map'}
        </span>
      </header>

      {pin ? (
        <>
          {/* Non-interactive: a picture of where the marker is, not somewhere to move it. */}
          <div className="h-56 overflow-hidden rounded-xl border border-slate-200 sm:h-64">
            <Suspense fallback={null}>
              <VetMap
                zoom={16}
                center={[pin.latitude, pin.longitude]}
                interactive={false}
                showOverlay={false}
                vets={ownMarker(application, address)}
              />
            </Suspense>
          </div>

          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-teal-800" aria-hidden />
            Pinned at {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          No marker was dropped for this address, so it is not on the public map. Write to us if it
          should be.
        </p>
      )}
    </section>
  );
}

export default function ProfessionalMapLocationPage() {
  const application = useConsoleApplication();
  const addresses = application.addresses ?? [];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Globe2 className="h-5 w-5 text-teal-800" />
          Map &amp; Location
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          These are the markers you dropped when you enquired. Approving your application is what
          put them on the public map, at the coordinates a reviewer read — so they are shown here
          and cannot be edited.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <Info className="mt-px h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>
            A pin is all publishing adds. Your address lines are already on your listing, and the
            device reading taken while verifying you stays private.
          </span>
        </p>
        <Link
          to="/map"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 hover:underline"
        >
          See the public map
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </header>

      {addresses.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 shadow-xs">
          There are no addresses on your application, so there is nothing on the map yet.
        </p>
      ) : (
        addresses.map((address) => (
          <AddressMapCard key={address.kind} application={application} address={address} />
        ))
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-amber-900">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          Moving a pin, or taking one off
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
          Everything you filed is checked as it was filed, locations included, so no part of it can
          be changed from here. If you have moved, or a marker is in the wrong place, email us with
          your licence number and we will correct it.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {SUPPORT_EMAIL}
        </a>
      </section>
    </div>
  );
}
