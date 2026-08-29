import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfessional } from '@/hooks/useProfessionals';
import type { PublicProfessional } from '@/services/professionals.service';
import { BadgeCheck, Briefcase, Calendar, MapPin, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

/** In the order a week runs, rather than the order the vet happened to save them in. */
const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const AVAILABILITY: Record<string, { label: string; tone: string }> = {
  available: { label: 'Taking bookings', tone: 'bg-emerald-100 text-emerald-900' },
  busy: { label: 'Fully booked', tone: 'bg-amber-100 text-amber-900' },
  unavailable: { label: 'Not taking bookings', tone: 'bg-slate-100 text-slate-700' },
};

const PANEL = 'rounded-xl border border-slate-900/10 bg-white p-6 shadow-sm';
const HEADING = 'text-sm font-bold uppercase tracking-wider text-slate-500';

/**
 * The hours the vet keeps, as a week.
 *
 * Every day is listed, closed ones included. "Closed on Sunday" is the answer somebody
 * is looking for as often as the opening time is, and a list that skipped it would
 * leave them guessing whether it was closed or simply unsaid.
 */
function Hours({ vet }: { vet: PublicProfessional }) {
  if (vet.weeklySchedule.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        They have not published their hours. Ask for a time and they will say if it does not suit.
      </p>
    );
  }

  return (
    <dl className="grid gap-1.5 text-sm">
      {WEEK.map((day) => {
        const entry = vet.weeklySchedule.find((item) => item.day === day);
        const open = entry?.enabled ? `${entry.startTime} – ${entry.endTime}` : 'Closed';

        return (
          <div key={day} className="flex justify-between gap-4">
            <dt className="text-slate-600">{day}</dt>
            <dd className={entry?.enabled ? 'font-semibold text-slate-900' : 'text-slate-400'}>
              {open}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Where somebody has worked, newest first.
 *
 * The requirement this page exists for: an owner deciding between two vets is deciding
 * on experience, and a listing that shows a number of years without what they were
 * spent on is a number they cannot weigh.
 */
function History({ vet }: { vet: PublicProfessional }) {
  if (vet.workHistory.length === 0) {
    return <p className="text-sm text-slate-600">Nothing published beyond the years above.</p>;
  }

  const sorted = [...vet.workHistory].sort((a, b) => b.startYear - a.startYear);

  return (
    <ol className="grid gap-4">
      {sorted.map((job) => (
        <li
          key={job.id ?? `${job.title}-${job.startYear}`}
          className="border-l-2 border-teal-800/20 pl-4"
        >
          <p className="font-bold text-slate-950">{job.title}</p>
          <p className="text-sm text-slate-600">{job.workplace}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {job.startYear} – {job.isCurrent ? 'now' : job.endYear ?? 'unknown'}
          </p>
          {job.description && (
            <p className="mt-1 text-sm leading-6 text-slate-600">{job.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * One vet's public profile: everything the directory publishes about them.
 *
 * Reachable without signing in, like the list it comes out of — somebody should be able
 * to read who they might book before making an account. What it does not carry is the
 * licence number, the photographs, or the device readings behind the addresses; those
 * are what a reviewer checked, and the API does not send them here.
 *
 * The button goes back to the booking flow with this vet already chosen, so reading the
 * work history costs nobody the choice they had already made.
 */
export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const query = useProfessional(id);
  const vet = query.data;

  useDocumentTitle(
    vet?.name ? `${vet.name} on Vetify` : 'A vet on Vetify',
    vet?.clinicName ?? 'A verified veterinarian.'
  );

  if (query.isPending) {
    return (
      <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 sm:px-8">
        <p className="mx-auto max-w-4xl text-slate-600">Loading…</p>
      </main>
    );
  }

  if (!vet) {
    return (
      <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-black tracking-tight">Not in the directory</h1>
          <p className="mt-3 text-slate-600">
            {/* Deliberately one answer for several causes: not verified, suspended, or
                never existed. Which one is not a stranger's business. */}
            This profile is not available. The vet may have taken their listing down.
          </p>
          <Link
            to="/book-appointment"
            className="mt-6 inline-block font-bold text-teal-800 hover:underline"
          >
            Browse the vets who are listed
          </Link>
        </div>
      </main>
    );
  }

  const availability = AVAILABILITY[vet.availabilityStatus] ?? AVAILABILITY.unavailable;

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className={PANEL}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 items-start gap-4">
              {vet.avatarUrl ? (
                <img src={vet.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : null}
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 text-3xl font-black tracking-tight">
                  {vet.name ?? vet.clinicName ?? 'A verified vet'}
                  {vet.verifiedAt && (
                    <span
                      title="Licence checked against the register"
                      className="inline-flex items-center gap-1 rounded-full bg-teal-900/5 px-2.5 py-1 text-xs font-bold text-teal-900"
                    >
                      <BadgeCheck className="h-4 w-4" aria-hidden />
                      Verified
                    </span>
                  )}
                </h1>
                {vet.clinicName && <p className="mt-1 text-slate-600">{vet.clinicName}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-slate-400" aria-hidden />
                    {vet.yearsExperience} year{vet.yearsExperience === 1 ? '' : 's'}
                  </span>
                  <span className="font-semibold text-slate-900">${vet.hourlyRate}/hr</span>
                  {vet.businessPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-slate-400" aria-hidden />
                      {vet.businessPhone}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${availability.tone}`}
                  >
                    {availability.label}
                  </span>
                </div>
              </div>
            </div>

            {vet.availabilityStatus === 'available' ? (
              <Link
                to={`/book-appointment?professional=${vet.id}`}
                className="inline-flex h-11 shrink-0 items-center rounded-lg bg-teal-800 px-6 text-sm font-bold text-white transition hover:bg-teal-900"
              >
                Request an appointment
              </Link>
            ) : (
              <p className="max-w-xs shrink-0 text-sm text-slate-600">
                They are not taking bookings at the moment. Their hours below are still what they
                keep when they are.
              </p>
            )}
          </div>

          {vet.specialties.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {vet.specialties.map((specialty) => (
                <li
                  key={specialty}
                  className="rounded-full bg-teal-900/5 px-3 py-1 text-xs font-semibold capitalize text-teal-900"
                >
                  {specialty}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <section className={PANEL}>
              <h2 className={HEADING}>About</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{vet.bio}</p>
            </section>

            <section className={PANEL}>
              <h2 className={HEADING}>Practice history</h2>
              <div className="mt-4">
                <History vet={vet} />
              </div>
            </section>
          </div>

          <div className="grid gap-6">
            <section className={PANEL}>
              <h2 className={`${HEADING} flex items-center gap-2`}>
                <MapPin className="h-4 w-4" aria-hidden />
                Where they work
              </h2>
              <ul className="mt-3 grid gap-3 text-sm">
                {vet.addresses.map((address) => (
                  <li key={`${address.kind}-${address.line1}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {address.kind === 'home' ? 'Practises from' : 'Clinic'}
                    </p>
                    <p className="text-slate-700">
                      {address.line1}, {address.city}, {address.province}
                      {address.postalCode ? ` ${address.postalCode}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className={PANEL}>
              <h2 className={`${HEADING} flex items-center gap-2`}>
                <Calendar className="h-4 w-4" aria-hidden />
                Hours
              </h2>
              <div className="mt-3">
                <Hours vet={vet} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
