import type { PublicProfessional } from '@/services/professionals.service';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shown when somebody arrives from a profile for a kind that vet does not do. Says so
// plainly and points at their profile, rather than dropping them from a list they were
// sent straight to.
export default function MismatchNote({ vet, offers }: { vet: PublicProfessional; offers: string }) {
  const who = vet.name ?? vet.clinicName ?? 'This professional';

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div>
          <p className="font-bold text-amber-900">
            {who} only offers {offers}.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Change the kind of appointment above to book with them, or choose another vet for what
            you picked.
          </p>
          <Link
            to={`/professionals/${vet.id}`}
            className="mt-3 inline-block text-sm font-bold text-teal-800 hover:underline"
          >
            View their profile
          </Link>
        </div>
      </div>
    </div>
  );
}
