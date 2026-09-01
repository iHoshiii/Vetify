import { MODERATION_REASON_MAX, MODERATION_REASON_MIN } from '@shared/limits';
import { useEffect, useId, useRef, useState } from 'react';

import { CONTROL } from './ui';

type Props = {
  open: boolean;
  /** Who the interview is with, for the heading. */
  applicant: string;
  isPending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (input: { interviewAt: string; note: string | null }) => void;
};

const CANCEL =
  'rounded-md border border-forest-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-forest-50 disabled:opacity-50';
const CONFIRM =
  'rounded-md bg-forest-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * `datetime-local` wants "YYYY-MM-DDTHH:mm" in the reader's own zone, which is not
 * what toISOString gives. Built by hand rather than sliced off a UTC string, which
 * would silently book a Manila afternoon for the morning.
 */
function localValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/**
 * Booking the conversation an applicant is waiting on.
 *
 * Its own dialog rather than the shared confirm one, because what this decision
 * needs is a time and not a paragraph — and the time is the whole point: it goes in
 * the email, and the applicant's screen counts down to it.
 */
export function InterviewDialog({ open, applicant, isPending, error, onCancel, onConfirm }: Props) {
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  /**
   * "Now", read once when the dialog opens rather than on every render.
   *
   * The floor a booking is measured against should not creep while somebody is
   * typing, and reading the clock during a render is a result that changes
   * whenever React happens to re-run one.
   */
  const [floor, setFloor] = useState<number | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const whenId = useId();
  const noteId = useId();
  const whenBox = useRef<HTMLInputElement | null>(null);

  // Cleared and focused on open, not on close: the box has to be empty for the
  // next booking, and wiping it on close would blank it mid-fade.
  useEffect(() => {
    if (!open) return;

    setWhen('');
    setNote('');
    setFloor(Date.now());
    whenBox.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel();
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const parsed = when ? new Date(when) : null;
  const valid =
    floor !== null &&
    parsed !== null &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.getTime() > floor;
  const trimmed = note.trim();
  // Same floor the shared note has, so a two-word note is refused here rather than
  // by a 400 from the route.
  const noteShort = trimmed.length > 0 && trimmed.length < MODERATION_REASON_MIN;

  function submit(): void {
    if (isPending || !valid || noteShort || !parsed) return;
    onConfirm({ interviewAt: parsed.toISOString(), note: trimmed || null });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Dismisses on click, hidden from assistive tech: Escape and Cancel are the
          reachable ways out, and a backdrop is not a button. */}
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
        className="relative w-full max-w-lg rounded-lg border border-forest-200 bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-black tracking-tight text-slate-950">
          Book an interview with {applicant}?
        </h2>
        <div id={bodyId} className="mt-2 text-sm leading-6 text-slate-600">
          Emails them the time and moves the application to &lsquo;interview&rsquo;. Not a verdict:
          the decision comes after the conversation, and this is recorded in the audit log rather
          than as a review.
        </div>

        <div className="mt-4">
          <label htmlFor={whenId} className="text-sm font-bold text-slate-800">
            Date and time <span className="font-semibold text-slate-500">(your local time)</span>
          </label>
          <input
            id={whenId}
            ref={whenBox}
            type="datetime-local"
            value={when}
            min={floor === null ? undefined : localValue(new Date(floor))}
            onChange={(event) => setWhen(event.target.value)}
            aria-describedby={`${whenId}-help`}
            aria-invalid={when !== '' && !valid ? true : undefined}
            className={`mt-1.5 w-full ${CONTROL} font-normal`}
          />
          <p
            id={`${whenId}-help`}
            aria-live="polite"
            className="mt-1.5 text-xs font-semibold text-slate-500"
          >
            {when === ''
              ? 'The applicant sees this in Philippine time.'
              : valid
              ? 'The applicant sees this in Philippine time.'
              : 'That time has already passed.'}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor={noteId} className="text-sm font-bold text-slate-800">
            Note <span className="font-semibold text-slate-500">(optional)</span>
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={MODERATION_REASON_MAX}
            aria-describedby={`${noteId}-help`}
            aria-invalid={noteShort || undefined}
            className={`mt-1.5 w-full ${CONTROL} font-normal`}
            placeholder="Anything they should bring, or how the call happens."
          />
          <p
            id={`${noteId}-help`}
            aria-live="polite"
            className="mt-1.5 text-xs font-semibold text-slate-500"
          >
            {noteShort
              ? `At least ${MODERATION_REASON_MIN} characters — ${trimmed.length} so far.`
              : 'Goes into the email under the time.'}
          </p>
        </div>

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
            onClick={submit}
            disabled={isPending || !valid || noteShort}
            className={CONFIRM}
          >
            {isPending ? 'Working…' : 'Book it'}
          </button>
        </div>
      </div>
    </div>
  );
}
