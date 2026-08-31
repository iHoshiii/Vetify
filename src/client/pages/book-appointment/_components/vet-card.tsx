import type { PublicProfessional } from '@/services/professionals.service';
import { Briefcase, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTION =
  'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold transition';
const PICK = `${ACTION} bg-teal-800 text-white hover:bg-teal-900`;
const VISIT = `${ACTION} border border-slate-900/15 bg-white text-slate-900 hover:border-slate-900/30`;

/** Where this vet works: the published line first, then what a search matched on. */
function Where({ vet }: { vet: PublicProfessional }) {
  const extra = vet.addresses.filter((address) => !vet.clinicAddress.includes(address.line1));

  return (
    <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div>
        <p>{vet.clinicAddress}</p>
        {extra.map((address) => (
          <p key={`${address.kind}-${address.line1}`} className="text-xs text-slate-500">
            {address.kind === 'home' ? 'Also practises from ' : 'Also at '}
            {address.line1}, {address.city}
          </p>
        ))}
      </div>
    </div>
  );
}

/** One vet as a row, with two actions: the flow, and the way out to their profile. */
export default function VetCard({
  vet,
  onPick,
  picked,
}: {
  vet: PublicProfessional;
  onPick: (vet: PublicProfessional) => void;
  picked: boolean;
}) {
  return (
    <li
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        picked ? 'border-teal-700 ring-2 ring-teal-700/30' : 'border-slate-900/10'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {vet.avatarUrl ? (
              // The alt is empty because the name is right beside it.
              <img src={vet.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black tracking-tight text-slate-950">
                {vet.name ?? vet.clinicName ?? 'A verified vet'}
              </h3>
              {vet.clinicName && (
                <p className="truncate text-sm text-slate-600">{vet.clinicName}</p>
              )}
            </div>
          </div>

          <Where vet={vet} />

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-slate-400" aria-hidden />
              {vet.yearsExperience} year{vet.yearsExperience === 1 ? '' : 's'}
            </span>
            <span className="font-semibold text-slate-900">${vet.hourlyRate}/hr</span>
          </div>

          {vet.specialties.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {vet.specialties.map((specialty) => (
                <li
                  key={specialty}
                  className="rounded-full bg-teal-900/5 px-2.5 py-0.5 text-xs font-semibold capitalize text-teal-900"
                >
                  {specialty}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button type="button" onClick={() => onPick(vet)} className={PICK}>
            {picked ? 'Chosen' : 'Choose'}
          </button>
          <Link to={`/professionals/${vet.id}`} className={VISIT}>
            View profile
          </Link>
        </div>
      </div>
    </li>
  );
}
