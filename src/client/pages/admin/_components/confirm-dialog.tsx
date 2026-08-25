import { MODERATION_REASON_MAX, MODERATION_REASON_MIN } from '@shared/limits';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Whether this decision needs saying why.
 *
 * `required` mirrors the server: a takedown and a ban are refused without a
 * reason, so the button stays held here rather than letting somebody type 'no'
 * and learn the floor from a 400. `optional` is for the reversible ones.
 */
export type ReasonMode = 'none' | 'optional' | 'required';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  reason?: ReasonMode;
  /** Red confirm button, for the decisions somebody has to justify. */
  destructive?: boolean;
  isPending?: boolean;
  /** A refusal the server sent back — a 409 guard, usually. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string | null) => void;
};

const CANCEL =
  'rounded-md border border-teal-900/15 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const CONFIRM =
  'rounded-md px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  reason = 'none',
  destructive,
  isPending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [text, setText] = useState('');
  const titleId = useId();
  const bodyId = useId();
  const reasonId = useId();
  const reasonBox = useRef<HTMLTextAreaElement | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

  // Cleared on open, not on close: the box has to be empty for the next
  // decision, and wiping it on close would blank the text mid-fade.
  useEffect(() => {
    if (!open) return;

    setText('');
    // The reason is the thing to be typed, so focus lands there when there is
    // one and on the button — never nowhere — when there is not.
    const target = reason === 'none' ? confirmButton.current : reasonBox.current;
    target?.focus();
  }, [open, reason]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel();
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = text.trim();
  const tooShort = reason === 'required' && trimmed.length < MODERATION_REASON_MIN;
  const short =
    reason === 'optional' && trimmed.length > 0 && trimmed.length < MODERATION_REASON_MIN;

  function submit(): void {
    if (isPending || tooShort || short) return;
    onConfirm(trimmed.length > 0 ? trimmed : null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Dismisses on click, hidden from assistive tech: Escape and Cancel are
          the reachable ways out, and a backdrop is not a button. */}
      <div
        className="absolute inset-0 bg-slate-950/40"
        onClick={onCancel}
        role="presentation"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative w-full max-w-lg rounded-lg border border-teal-900/10 bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-black tracking-tight text-slate-950">
          {title}
        </h2>
        <div id={bodyId} className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </div>

        {reason !== 'none' && (
          <div className="mt-4">
            <label htmlFor={reasonId} className="text-sm font-bold text-slate-800">
              Reason{' '}
              <span className="font-semibold text-slate-500">
                {reason === 'required' ? '(required)' : '(optional)'}
              </span>
            </label>
            <textarea
              id={reasonId}
              ref={reasonBox}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              maxLength={MODERATION_REASON_MAX}
              aria-describedby={`${reasonId}-help`}
              aria-invalid={tooShort || short || undefined}
              className="mt-1.5 w-full rounded-md border border-teal-900/15 px-3 py-2 text-sm text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
              placeholder="What did this break, and how did you check?"
            />
            {/* Live, so the count and the floor are heard as they are typed. */}
            <p
              id={`${reasonId}-help`}
              aria-live="polite"
              className="mt-1.5 text-xs font-semibold text-slate-500"
            >
              {tooShort || short
                ? `At least ${MODERATION_REASON_MIN} characters \u2014 ${trimmed.length} so far.`
                : `${text.length} of ${MODERATION_REASON_MAX} characters. This is kept in the audit log.`}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={isPending} className={CANCEL}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmButton}
            onClick={submit}
            disabled={isPending || tooShort || short}
            className={`${CONFIRM} ${
              destructive ? 'bg-rose-700 hover:bg-rose-800' : 'bg-teal-800 hover:bg-teal-900'
            }`}
          >
            {isPending ? 'Working\u2026' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
