import { useCapture } from '@/hooks/useProfessionals';
import type {
  OwnProfessional,
  ProfessionalAddressView,
  ProfessionalStatus,
} from '@/services/professionals.service';
import type { ProfessionalPhotoKind } from '@shared/limits';
import { Link } from 'react-router-dom';

/** What each outcome means, in the words the applicant needs. */
const STATES: Record<
  ProfessionalStatus,
  { label: string; tone: string; heading: string; body: string }
> = {
  pending: {
    label: 'Under review',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    heading: 'Your application is with a reviewer.',
    body: 'We check the licence against the issuing authority before listing anyone.',
  },
  interview: {
    label: 'Interview booked',
    tone: 'bg-blue-50 text-blue-800 border-blue-200',
    heading: 'There is a conversation in the diary.',
    body: 'The time is below, and it went to your inbox as well. After the interview comes the decision, which appears on this page.',
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
    body: 'The reason is below. If it is something you can clear up, get in touch — an appeal that gets a hearing is booked as an interview.',
  },
  suspended: {
    label: 'Paused',
    tone: 'bg-slate-100 text-slate-700 border-slate-300',
    heading: 'Your listing is paused.',
    body: 'You are not shown in the directory while this stands. The reason is below.',
  },
};

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeStyle: 'short' };

function on(value: string | null, options: Intl.DateTimeFormatOptions = DATE): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, options);
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

/** One address as a line, with what the device said about it. */
function AddressLine({ address }: { address: ProfessionalAddressView }) {
  const parts = [address.line1, address.city, address.province, address.postalCode].filter(Boolean);

  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {address.kind === 'home' ? 'Home address' : 'Clinic address'}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">
        {parts.join(', ')}
        {address.fix && (
          <span className="mt-0.5 block text-xs text-slate-500">
            Located to about {Math.round(address.fix.accuracyMeters)} m
          </span>
        )}
      </dd>
    </div>
  );
}

const PHOTO_LABELS: Record<ProfessionalPhotoKind, string> = {
  portrait: 'Your photograph',
  licenseFront: 'Licence, front',
  licenseBack: 'Licence, back',
};

/**
 * One of the three photographs, fetched rather than linked.
 *
 * The route behind it wants the bearer token, which an `<img src>` would not send,
 * so the bytes come through the API layer and the object URL is revoked when this
 * leaves the screen.
 */
function Photo({ kind, id }: { kind: ProfessionalPhotoKind; id: string }) {
  const { url, isPending, isError } = useCapture(id);

  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex h-40 items-center justify-center bg-slate-50">
        {url ? (
          <img src={url} alt={PHOTO_LABELS[kind]} className="h-40 w-full object-contain" />
        ) : (
          <p className="px-3 text-center text-xs text-slate-500">
            {isError ? 'This photograph could not be loaded.' : isPending ? 'Loading…' : ''}
          </p>
        )}
      </div>
      <figcaption className="border-t border-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
        {PHOTO_LABELS[kind]}
      </figcaption>
    </figure>
  );
}

/**
 * The applicant's own view of what they filed.
 *
 * Read-only throughout, and that is the design rather than a shortcut: the licence
 * was checked against a register and the photographs against a face, so an edit
 * here would quietly detach a verified listing from what was actually verified.
 * Anything that needs changing goes through us.
 */
export default function ApplicationStatus({ application }: { application: OwnProfessional }) {
  const state = STATES[application.status];
  const filed = on(application.createdAt);
  const decided = on(application.reviewedAt);
  const interview = on(application.interviewAt, DATE_TIME);
  const photos = Object.entries(application.captures) as Array<[ProfessionalPhotoKind, string]>;

  return (
    <div className="mt-10">
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${state.tone}`}
      >
        {state.label}
      </span>

      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{state.heading}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{state.body}</p>

      {interview && (
        <div className="mt-5 max-w-2xl rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <p className="text-sm font-bold text-slate-950">Interview: {interview}</p>
          {application.interviewNote && (
            <p className="mt-1 text-sm leading-6 text-slate-700">{application.interviewNote}</p>
          )}
        </div>
      )}

      {application.rejectionReason && (
        <p className="mt-5 max-w-2xl rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          <strong className="block font-bold text-slate-950">Reason given</strong>
          {application.rejectionReason}
        </p>
      )}

      <dl className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <Detail label="Name" value={application.fullName} />
        <Detail label="License" value={application.licenseNumber} />
        <Detail label="Issued by" value={application.licenseAuthority} />
        <Detail label="Clinic" value={application.clinicName ?? 'Not given'} />
        {application.addresses.map((address) => (
          <AddressLine key={address.kind} address={address} />
        ))}
        <Detail label="Business number" value={application.businessPhone ?? 'Not given'} />
        <Detail label="Years in practice" value={String(application.yearsExperience)} />
        {filed && <Detail label="Applied" value={filed} />}
        {decided && <Detail label="Reviewed" value={decided} />}
      </dl>

      {photos.length > 0 && (
        <section className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            What you photographed
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {photos.map(([kind, id]) => (
              <Photo key={kind} kind={kind} id={id} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-slate-900">Something above is wrong?</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          None of it can be edited here. It was checked as it was filed. If any of it is wrong,{' '}
          {/* A new tab, because leaving this page loses the photographs already taken */}
          <Link
            to="/contact"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-teal-800 underline"
          >
            contact us
          </Link>
          .
        </p>
      </div>

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
            to="/professionals/apply"
            className="inline-flex h-11 items-center rounded-xl border border-slate-900/15 bg-white px-6 text-sm font-bold text-slate-900 hover:border-slate-900/30"
          >
            Get in touch
          </Link>
        )}
      </div>
    </div>
  );
}
