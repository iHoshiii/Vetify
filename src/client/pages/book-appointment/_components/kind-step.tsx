import type { PublicProfessional } from '@/services/professionals.service';
import { APPOINTMENT_KINDS, type AppointmentKind } from '@shared/schemas';
import { Building2, Info, Video } from 'lucide-react';

import { offersKind } from './service-offer';

/** What each kind of visit is, in the words somebody choosing needs. */
const KIND: Record<AppointmentKind, { title: string; blurb: string; icon: typeof Building2 }> = {
  onsite: {
    title: 'Clinic visit',
    blurb:
      'You bring your pet to the address on the vet’s listing. The right choice for anything that needs examining, handling or treating.',
    icon: Building2,
  },
  virtual: {
    title: 'Online consultation',
    blurb:
      'A call at the time you book. Good for advice, follow-ups and deciding whether a visit is needed at all. The vet sends a link when they confirm.',
    icon: Video,
  },
};

const CARD =
  'flex flex-col gap-3 rounded-xl border border-slate-900/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CARD_ON = 'border-teal-700 ring-2 ring-teal-700/30';

/** Step two: which service, from the ones THIS vet offers. Onsite needs a clinic. */
export default function KindStep({
  vet,
  value,
  onPick,
}: {
  vet: PublicProfessional;
  value: AppointmentKind | null;
  onPick: (kind: AppointmentKind) => void;
}) {
  const offered = APPOINTMENT_KINDS.filter((kind) => offersKind(vet, kind));
  const who = vet.name ?? vet.clinicName ?? 'This professional';

  return (
    <div className="grid gap-4">
      {/* When a vet does only one, say so plainly rather than showing a lone card as a choice. */}
      {offered.length === 1 && (
        <p className="flex items-start gap-2 rounded-lg bg-teal-900/5 px-3 py-2.5 text-sm text-teal-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
          {who} only offers {KIND[offered[0]].title.toLowerCase()}s.
        </p>
      )}

      <div className={`grid gap-4 ${offered.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {offered.map((kind) => {
          const { title, blurb, icon: Icon } = KIND[kind];

          return (
            <button
              key={kind}
              type="button"
              onClick={() => onPick(kind)}
              aria-pressed={value === kind}
              className={`${CARD} ${value === kind ? CARD_ON : ''}`}
            >
              <Icon className="h-6 w-6 text-teal-800" aria-hidden />
              <span className="text-lg font-black tracking-tight text-slate-950">{title}</span>
              <span className="text-sm leading-6 text-slate-600">{blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
