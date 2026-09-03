import type { AdminInquiry } from '@/services/admin.service';
import { useEffect, useId } from 'react';

import { LABEL } from './ui';

export function EnquiryDialog({
  inquiry,
  onClose,
}: {
  inquiry: AdminInquiry;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/40"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-lg border border-forest-200 bg-white p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-forest-900">
              {inquiry.name}
            </h2>
            <p className="text-sm text-slate-500">{inquiry.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <div>
            <dt className={LABEL}>Licence claimed</dt>
            <dd className="mt-0.5">{inquiry.licenseNumber}</dd>
          </div>
          <div>
            <dt className={LABEL}>Where</dt>
            <dd className="mt-0.5">
              {inquiry.currentLocation}
              {inquiry.clinicLocation ? ` · practises in ${inquiry.clinicLocation}` : ''}
            </dd>
          </div>
          {inquiry.phone && (
            <div>
              <dt className={LABEL}>Phone number</dt>
              <dd className="mt-0.5">{inquiry.phone}</dd>
            </div>
          )}
          {inquiry.yearsExperience !== null && (
            <div>
              <dt className={LABEL}>Experience</dt>
              <dd className="mt-0.5">{inquiry.yearsExperience} years</dd>
            </div>
          )}
          <div>
            <dt className={LABEL}>Why they want to join</dt>
            <dd className="mt-0.5 whitespace-pre-line leading-6">{inquiry.motivation}</dd>
          </div>
          {inquiry.inviteNote && (
            <div>
              <dt className={LABEL}>Note you sent</dt>
              <dd className="mt-0.5 leading-6">{inquiry.inviteNote}</dd>
            </div>
          )}
          {inquiry.declineReason && (
            <div>
              <dt className={LABEL}>Why it was rejected</dt>
              <dd className="mt-0.5 leading-6">{inquiry.declineReason}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-forest-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-forest-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
