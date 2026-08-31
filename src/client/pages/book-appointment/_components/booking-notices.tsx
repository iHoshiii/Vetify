import type { RequestResult } from '@/services/appointments.service';

/** The request landed, and whether each side actually heard about it. */
export function AskedNotice({ mail }: { mail: RequestResult['mail'] }) {
  return (
    <div role="status" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-black text-emerald-900">
        Asked. That time is held for you while they answer.
      </p>
      <p className="mt-1 text-sm text-emerald-900/80">
        {mail.client.delivered
          ? 'We have emailed you a copy.'
          : `We could not email you a copy: ${mail.client.deliveryError}`}
        {mail.professional.delivered
          ? ''
          : ' The vet was not reachable by email either, so it may be worth ringing them.'}
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
