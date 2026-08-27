import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { OwnProfessional } from '@/services/professionals.service';
import type { ProfessionalAvailabilityStatus } from '@shared/limits';
import {
  Briefcase,
  CalendarDays,
  Eye,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useConsoleApplication } from './professional-layout';

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const STATUS_CHIP: Record<ProfessionalAvailabilityStatus, { label: string; className: string }> = {
  available: {
    label: 'Available for bookings',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  busy: { label: 'Currently busy', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  unavailable: { label: 'Off duty', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

/** 24h to something a pet owner reads without thinking about it. */
function prettyTime(value: string): string {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-6 ${className}`}>
      {children}
    </section>
  );
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-slate-900">
      {icon}
      {children}
    </h2>
  );
}

function PublicView({ application }: { application: OwnProfessional }) {
  const status = STATUS_CHIP[application.availabilityStatus];
  const openDays = DAY_ORDER.map((day) => application.weeklySchedule.find((s) => s.day === day))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
    .filter((slot) => slot.enabled);

  const workHistory = [...application.workHistory].sort((a, b) => b.startYear - a.startYear);

  return (
    <div className="space-y-5">
      {/* Identity */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-teal-200 bg-teal-100 text-teal-800">
            {application.avatarUrl ? (
              <img
                src={application.avatarUrl}
                alt={application.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-9 w-9" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Dr. {application.fullName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                <ShieldCheck className="h-3 w-3" /> Verified Partner
              </span>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-700">
              {application.clinicName || 'Independent Practice'}
              <span className="text-slate-400"> · </span>
              <span className="text-teal-900">${application.hourlyRate}/hr consultation</span>
              <span className="text-slate-400"> · </span>
              {application.yearsExperience} yr
              {application.yearsExperience === 1 ? '' : 's'} experience
            </p>

            <div className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                {application.clinicAddress}
              </span>
              {application.businessPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {application.businessPhone}
                </span>
              )}
            </div>

            {application.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {application.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Bio */}
      <Card className="space-y-2">
        <CardTitle icon={<Stethoscope className="h-4 w-4 text-teal-800" />}>About</CardTitle>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {application.bio}
        </p>
      </Card>

      {/* Consultation hours */}
      <Card className="space-y-3">
        <CardTitle icon={<CalendarDays className="h-4 w-4 text-teal-800" />}>
          Consultation Hours
        </CardTitle>
        {openDays.length === 0 ? (
          <p className="text-xs text-slate-500">
            No weekly hours published yet — set them in Professional Settings and pet owners will
            see them here.
          </p>
        ) : (
          <dl className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {openDays.map((slot) => (
              <div
                key={slot.day}
                className="flex items-center justify-between px-3 py-2 text-xs even:bg-slate-50/60"
              >
                <dt className="font-bold text-slate-800">{slot.day}</dt>
                <dd className="font-semibold text-slate-600">
                  {prettyTime(slot.startTime)} – {prettyTime(slot.endTime)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* Work history */}
      {workHistory.length > 0 && (
        <Card className="space-y-3">
          <CardTitle icon={<Briefcase className="h-4 w-4 text-teal-800" />}>
            Practice History
          </CardTitle>
          <ol className="space-y-3">
            {workHistory.map((job, idx) => (
              <li
                key={job.id ?? `${job.title}-${job.startYear}-${idx}`}
                className="border-l-2 border-teal-200 pl-3"
              >
                <p className="text-sm font-bold text-slate-900">{job.title}</p>
                <p className="text-xs font-semibold text-slate-600">
                  {job.workplace}
                  <span className="text-slate-400"> · </span>
                  {job.startYear}–{job.isCurrent ? 'Present' : job.endYear ?? 'Present'}
                </p>
                {job.description && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{job.description}</p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

/**
 * The professional's own listing, rendered from the same fields the public
 * directory reads. Private records (licence number, home address, verification
 * photographs) are deliberately absent: this page answers "what does a pet owner
 * see when they open me", so anything they cannot see does not belong on it.
 *
 * The application comes from the console layout, which has already established
 * that there is one and that it is verified.
 */
export default function ProfessionalProfilePage() {
  useDocumentTitle('Your public profile', 'How pet owners see your Vetify listing.');

  const application = useConsoleApplication();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <Eye className="h-5 w-5 text-teal-800" />
            Profile preview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Exactly what a pet owner sees when they open your listing.
          </p>
        </div>
        <Link
          to="/professionals"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-teal-900/20 bg-white px-4 text-xs font-bold text-teal-900 shadow-sm transition-colors hover:border-teal-700"
        >
          Open the directory
        </Link>
      </div>

      <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-2.5 text-xs font-semibold text-teal-900">
        Read-only preview. Rate, availability and hours come from Professional Settings; licence and
        clinic records are fixed and never shown publicly.
      </div>

      <PublicView application={application} />
    </div>
  );
}
