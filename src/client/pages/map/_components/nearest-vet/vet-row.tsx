import { formatDistance, vetLabel, vetSubLabel } from '@/components/map-prof-vet';
import type { NearbyProfessional } from '@/services/professionals.service';
import type { ProfessionalAddressKind } from '@shared/schemas';
import { CalendarPlus, Hospital, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

const AVAILABILITY: Record<NearbyProfessional['availabilityStatus'], string> = {
  available: 'Taking bookings',
  busy: 'Fully booked',
  unavailable: 'Not taking bookings',
};

const AVAILABILITY_TONE: Record<NearbyProfessional['availabilityStatus'], string> = {
  available: 'text-emerald-700',
  busy: 'text-amber-700',
  unavailable: 'text-slate-500',
};

// A home address is the vet themselves, so what it can offer is a call, not a visit.
const BOOK_WORDS: Record<ProfessionalAddressKind, string> = {
  home: 'Online Consultation',
  clinic: 'Clinic visit',
};

export function VetRow({
  vet,
  kind,
  distanceMeters,
}: {
  vet: NearbyProfessional;
  kind: ProfessionalAddressKind;
  distanceMeters: number;
}) {
  const person = vet.name ?? vet.clinicName ?? 'A verified vet';
  const named = { kind, name: person, clinicName: vet.clinicName };
  const heading = vetLabel(named);
  const second = vetSubLabel(named);
  const distance = formatDistance(distanceMeters);
  const book = BOOK_WORDS[kind];

  return (
    <li>
      <div className="relative flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
        {/* Covers the card so the whole row still opens the profile, without an anchor inside an anchor. */}
        <Link
          to={`/professionals/${vet.id}`}
          aria-label={`${heading}, profile`}
          className="absolute inset-0 rounded-2xl"
        />

        {/* A clinic row is a place, so it wears the clinic mark; a home row is the vet, so it wears their face. */}
        {kind === 'clinic' ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-2 ring-teal-100">
            <Hospital className="h-5 w-5" />
          </span>
        ) : vet.avatarUrl ? (
          <img
            src={vet.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-blue-100"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-2 ring-teal-100">
            <Stethoscope className="h-5 w-5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{heading}</span>
          {second && (
            <span className="block truncate text-xs font-semibold text-slate-600">{second}</span>
          )}
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={AVAILABILITY_TONE[vet.availabilityStatus]}>
              {AVAILABILITY[vet.availabilityStatus]}
            </span>
            {/* The rate is the vet's own consulting fee, so it belongs on their row and not on a clinic's. */}
            {kind === 'home' && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">₱{vet.hourlyRate} an hour</span>
              </>
            )}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs font-black text-blue-700">{distance} away</span>

          {vet.availabilityStatus === 'available' && (
            <Link
              to={`/book-appointment?professional=${vet.id}`}
              aria-label={`${book} with ${person}`}
              className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-teal-800 px-2.5 py-1.5 text-[11px] font-bold leading-none text-white transition-colors hover:bg-teal-900"
            >
              <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {book}
            </Link>
          )}
        </span>
      </div>
    </li>
  );
}
