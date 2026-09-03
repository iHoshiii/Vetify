import type { AdminProfessional } from '@/services/admin.service';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useId } from 'react';

import { LABEL } from './ui';

export function ApplicationDialog({
  application,
  onClose,
}: {
  application: AdminProfessional;
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
              {application.applicant?.name ?? application.clinicName}
            </h2>
            <p className="text-sm text-slate-500">
              {application.applicant?.email ?? `Licence ${application.licenseNumber}`}
            </p>
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
            <dt className={LABEL}>Licence</dt>
            <dd className="mt-0.5">
              {application.licenseNumber} &middot; {application.licenseAuthority}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Clinic</dt>
            <dd className="mt-0.5">
              {application.clinicName} &middot; {application.clinicAddress}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Experience</dt>
            <dd className="mt-0.5">
              {application.yearsExperience} year{application.yearsExperience === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Rate</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              ${application.hourlyRate}/hr &middot; {application.specialties.join(', ')}
              {application.flaggedForRateReview && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  <AlertTriangle className="h-3 w-3" />
                  Above the rate their {application.yearsExperience} yrs allows
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Introduction</dt>
            <dd className="mt-0.5 whitespace-pre-line leading-6">{application.bio}</dd>
          </div>
          <div>
            <dt className={LABEL}>Credentials</dt>
            <dd className="mt-0.5">
              <ul className="space-y-1">
                {application.credentialUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-semibold text-forest-700 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
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
