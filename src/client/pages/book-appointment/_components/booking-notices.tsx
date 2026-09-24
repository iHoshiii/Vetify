import type { RequestResult } from '@/services/appointments.service';

/** The request landed. The owner is emailed later, on the vet's decision, not now. */
export function AskedNotice({ mail }: { mail: RequestResult['mail'] }) {
  return (
    <div role="status" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-black text-emerald-900">
        Asked. That time is held for you while they answer.
      </p>
      <p className="mt-1 text-sm text-emerald-900/80">
        {/* An email follows only when the vet decides, and only if you gave an address. */}
        {mail.professional.delivered
          ? "We have let the vet know. You'll hear back once they confirm or decline."
          : 'The vet was not reachable by email, so it may be worth ringing them.'}
      </p>
    </div>
  );
}

/** Somebody else took the slot first, which is a race rather than a fault. */
export function TakenNotice() {
  return (
    <div role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-black text-amber-900">Somebody just took that time.</p>
      <p className="mt-1 text-sm text-amber-900/80">
        The times below have been refreshed. Pick another and we will hold it for you.
      </p>
    </div>
  );
}
