import { formatDistance } from '@/components/map-prof-vet';
import type { NearbyProfessional } from '@/services/professionals.service';
import { CalendarPlus, Stethoscope } from 'lucide-react';
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

export function VetRow({ vet }: { vet: NearbyProfessional }) {
  const name = vet.name ?? vet.clinicName ?? 'A verified vet';
  const distance = formatDistance(vet.distanceMeters);

  return (
    <li>
      <Link
        to={`/professionals/${vet.id}`}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
      >
        {vet.avatarUrl ? (
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
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{name}</span>
            <span className="shrink-0 text-xs font-black text-blue-700">{distance} away</span>
          </span>
          <span className="block truncate text-xs text-slate-500">
            {vet.specialties.slice(0, 2).join(' · ') || 'General practice'}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={AVAILABILITY_TONE[vet.availabilityStatus]}>
              {AVAILABILITY[vet.availabilityStatus]}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">₱{vet.hourlyRate} an hour</span>
          </span>
        </span>
      </Link>

      {vet.availabilityStatus === 'available' && (
        <Link
          to={`/book-appointment?professional=${vet.id}`}
          aria-label={`Book an appointment with ${name}`}
          className="mt-1.5 ml-14 inline-flex items-center gap-1.5 rounded-full bg-teal-800 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-teal-900"
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Book an Appointment
        </Link>
      )}
    </li>
  );
}
