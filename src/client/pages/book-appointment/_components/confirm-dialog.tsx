import type { PublicProfessional } from '@/services/professionals.service';
import { APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import type { AppointmentKind } from '@shared/schemas';

import DialogShell, {
  DIALOG_PRIMARY,
  DIALOG_SECONDARY,
} from '@/pages/professionals/_components/dialog-shell';
import type { BookingDetails } from './booking-form';
import { runLabel, type Run } from './slot-span';

// A run's cost is its hours times the rate; the whole booking is the sum of its runs.
function pesos(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

/** Everything about to be asked for, held for a yes. Confirming here is what sends it. */
export default function ConfirmDialog({
  open,
  vet,
  kind,
  runs,
  details,
  isPending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  vet: PublicProfessional;
  kind: AppointmentKind;
  runs: Run[];
  details: BookingDetails;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const hours = runs.reduce((sum, run) => sum + run.slots, 0);
  const total = hours * vet.hourlyRate;
  const place = kind === 'onsite' ? 'At the clinic' : 'Online consultation';

  return (
    <DialogShell
      open={open}
      eyebrow="Confirm your request"
      title={vet.name ?? vet.clinicName ?? 'Your vet'}
      lead={`${place} · ${pesos(vet.hourlyRate)}/hour`}
      onCancel={onCancel}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className={DIALOG_SECONDARY}>
            Go back
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className={DIALOG_PRIMARY}>
            {isPending
              ? 'Sending…'
              : `Confirm ${runs.length === 1 ? 'request' : `${runs.length} requests`}`}
          </button>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto px-6 py-5 sm:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {runs.length === 1 ? 'Your visit' : `${runs.length} separate visits`}
          </p>
          <ul className="mt-2 space-y-1">
            {runs.map((run) => (
              <li key={run.startsAt} className="flex justify-between text-sm">
                <span className="font-semibold text-slate-800">
                  {runLabel(run, APPOINTMENT_SLOT_MINUTES)}
                </span>
                <span className="tabular-nums text-slate-600">
                  {pesos(run.slots * vet.hourlyRate)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">{pesos(total)}</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Pet</dt>
          <dd className="font-semibold text-slate-800">
            {details.petName ? `${details.petName} · ` : ''}
            {details.petSpecies}
            {details.petBreed ? ` (${details.petBreed})` : ''}
          </dd>
          {details.petAge && (
            <>
              <dt className="text-slate-500">Age</dt>
              <dd className="font-semibold text-slate-800">{details.petAge}</dd>
            </>
          )}
          <dt className="text-slate-500">Phone</dt>
          <dd className="font-semibold text-slate-800">{details.phone}</dd>
        </dl>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{details.reason}</p>
        </div>

        <p className="text-xs text-slate-500">
          Each time is held the moment you confirm, while the vet answers.
        </p>
      </div>
    </DialogShell>
  );
}
