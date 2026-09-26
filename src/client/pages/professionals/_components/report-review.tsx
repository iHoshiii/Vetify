import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReportReview } from '@/hooks/useReviews';
import type { ProfessionalReview } from '@/services/professionals.service';
import { REVIEW_REPORT_REASON_MAX } from '@shared/limits';
import { X } from 'lucide-react';
import { useState } from 'react';

// The public "something is wrong with this review" dialog: a reason, then a report an admin decides on later. Shown only to signed-in visitors, one review at a time.
export default function ReportReview({
  professionalId,
  review,
  onClose,
}: {
  professionalId: string;
  review: ProfessionalReview;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const dialogRef = useFocusTrap<HTMLElement>(onClose);
  const [reason, setReason] = useState('');
  const report = useReportReview();

  const trimmed = reason.trim();

  function submit(): void {
    if (report.isPending || trimmed.length === 0) return;
    report.mutate({ professionalId, appointmentId: review.id, reason: trimmed });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report this review"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {report.isSuccess ? (
          <div>
            <h2 className="pr-8 text-lg font-black tracking-tight text-slate-950">Thanks</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A moderator will take a look. You can close this now.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <h2 className="pr-8 text-lg font-black tracking-tight text-slate-950">
              Report this review
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tell us what is wrong with it. A moderator reads every report before anything happens
              to the review.
            </p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={REVIEW_REPORT_REASON_MAX}
              placeholder="What is wrong with this review?"
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {reason.length} of {REVIEW_REPORT_REASON_MAX} characters.
            </p>

            {report.isError && (
              <p
                role="alert"
                className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {report.error instanceof Error ? report.error.message : 'Something went wrong.'}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={report.isPending || trimmed.length === 0}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {report.isPending ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
