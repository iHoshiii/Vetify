import type { OwnProfessional, ProfessionalStatus } from '@/services/professionals.service';
import { Link } from 'react-router-dom';

/**
 * What each outcome means, in the words the applicant needs.
 *
 * Approval mail is not wired up yet, so every state says where the answer will
 * appear rather than promising an email that is not sent.
 */
const STATES: Record<
  ProfessionalStatus,
  { label: string; tone: string; heading: string; body: string }
> = {
  pending: {
    label: 'Under review',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    heading: 'Your application is with a reviewer.',
    body: 'We check the license against the issuing authority before listing anyone. This page shows the outcome as soon as there is one.',
  },
  verified: {
    label: 'Verified',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    heading: 'You are listed in the directory.',
    body: 'Pet owners can find you and read your introduction. You can also publish posts on the blog now.',
  },
  rejected: {
    label: 'Not approved',
    tone: 'bg-red-50 text-red-700 border-red-200',
    heading: 'We could not verify this application.',
    body: 'The reason is below. If it is something you can clear up, get in touch and we will reopen it.',
  },
  suspended: {
    label: 'Paused',
    tone: 'bg-slate-100 text-slate-700 border-slate-300',
    heading: 'Your listing is paused.',
    body: 'You are not shown in the directory while this stands. The reason is below.',
  },
};

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

function on(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, DATE);
}

/** A row of the submitted-details list. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default function ApplicationStatus({ application }: { application: OwnProfessional }) {
  const state = STATES[application.status];
  const filed = on(application.createdAt);
  const decided = on(application.reviewedAt);

  return (
    <div className="mt-10">
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${state.tone}`}
      >
        {state.label}
      </span>

      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{state.heading}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{state.body}</p>

      {application.rejectionReason && (
        <p className="mt-5 max-w-2xl rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          <strong className="block font-bold text-slate-950">Reason given</strong>
          {application.rejectionReason}
        </p>
      )}

      <dl className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <Detail label="License" value={application.licenseNumber} />
        <Detail label="Issued by" value={application.licenseAuthority} />
        <Detail label="Clinic" value={application.clinicName} />
        <Detail label="Address" value={application.clinicAddress} />
        <Detail
          label="Specialties"
          value={
            application.specialties.length ? application.specialties.join(', ') : 'None listed'
          }
        />
        <Detail label="Years in practice" value={String(application.yearsExperience)} />
        {filed && <Detail label="Applied" value={filed} />}
        {decided && <Detail label="Reviewed" value={decided} />}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        {application.status === 'verified' ? (
          <Link
            to="/professionals"
            className="inline-flex h-11 items-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800"
          >
            See the directory
          </Link>
        ) : (
          <Link
            to="/contact"
            className="inline-flex h-11 items-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 hover:border-slate-900/30"
          >
            Get in touch
          </Link>
        )}
      </div>
    </div>
  );
}
