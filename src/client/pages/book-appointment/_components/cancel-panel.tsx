import { MODERATION_REASON_MIN } from '@shared/limits';

/** Asked rather than optional: the vet is told, and a reason beats a disappearance. */
export default function CancelPanel({
  reason,
  onReason,
  onConfirm,
  onKeep,
  isPending,
  error,
}: {
  reason: string;
  onReason: (reason: string) => void;
  onConfirm: () => void;
  onKeep: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <label htmlFor="cancel-reason" className="text-sm font-bold text-rose-900">
        Why are you cancelling?
      </label>
      <textarea
        id="cancel-reason"
        value={reason}
        onChange={(event) => onReason(event.target.value)}
        rows={2}
        className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm"
        placeholder="Milo is much better, no need for the visit."
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending || reason.trim().length < MODERATION_REASON_MIN}
          className="inline-flex h-9 items-center rounded-lg bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60"
        >
          {isPending ? 'Cancelling…' : 'Cancel it'}
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
