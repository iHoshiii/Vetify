import { useUpdateProfessionalProfile, useOwnApplication } from '@/hooks/useProfessionals';
import type { OwnProfessional } from '@/services/professionals.service';
import {
  calculateMaxRecommendedRate,
  PROFESSIONAL_BOOKING_NOTIFICATION_TIMES,
  PROFESSIONAL_MAX_RATE_CAP,
  PROFESSIONAL_MIN_RATE,
  type ProfessionalAvailabilityStatus,
  type ProfessionalBookingNotificationTime,
} from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';
import { AlertTriangle, CheckCircle2, ChevronDown, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The professional half of the settings tray.
 *
 * Three rows, each a form small enough to finish in the tray rather than a page:
 * the rate, the week, and how early the reminder lands. Everything else a vet has
 * on file was matched against a licence register when they applied, so it is not
 * editable here at any width — the experience row says so and points at support.
 *
 * All three are deliberately terse. This panel is ~22rem across and capped at 70vh,
 * so a field gets a label and, at most, one line saying what the value has to be.
 */

const DAYS = [
  ['Monday', 'Mon'],
  ['Tuesday', 'Tue'],
  ['Wednesday', 'Wed'],
  ['Thursday', 'Thu'],
  ['Friday', 'Fri'],
  ['Saturday', 'Sat'],
  ['Sunday', 'Sun'],
] as const;

const STATUS_LABEL: Record<ProfessionalAvailabilityStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  unavailable: 'Off duty',
};

const STATUS_ACTIVE: Record<ProfessionalAvailabilityStatus, string> = {
  available: 'bg-emerald-600 text-white',
  busy: 'bg-amber-500 text-white',
  unavailable: 'bg-rose-600 text-white',
};

const FIELD =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

const PILL = 'rounded-md px-2 py-1 text-[11px] font-bold transition-colors';
const PILL_IDLE = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

interface SectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/** Every day of the week open 09:00–17:00, for a vet who has never set hours. */
function defaultSchedule(): WeeklyScheduleItem[] {
  return DAYS.map(([day]) => ({ day, enabled: true, startTime: '09:00', endTime: '17:00' }));
}

/**
 * The accordion row every professional setting sits in — same shape as the rows in
 * the user tray, so the two trays read alike.
 *
 * The body is mounted only while open. The tray panel itself is in the DOM from
 * first paint even when hidden, so an editor mounted with it would have seeded its
 * state before the application query answered and then saved those blanks over
 * real values. Opening the row is what gives it something true to read.
 */
function TraySection({
  label,
  summary,
  isExpanded,
  onToggle,
  children,
}: SectionProps & { label: string; summary: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-700">{label}</span>
          <span className="block truncate text-xs text-slate-500">{summary}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * The submit button and the two things that can follow it, in one place rather
 * than copied into all three forms.
 */
function SaveRow({
  pending,
  error,
  saved,
  label,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
  label: string;
}) {
  return (
    <>
      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-700">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-800 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-900 disabled:opacity-50"
      >
        {pending ? 'Saving…' : label}
      </button>
    </>
  );
}

/**
 * Shared plumbing for the three forms: the mutation, and the two bits of feedback
 * a save can produce. `save` takes just the keys that row owns — the endpoint
 * merges, so nothing else has to be resent.
 */
function useSave() {
  const updateProfile = useUpdateProfessionalProfile();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return {
    pending: updateProfile.isPending,
    error,
    saved,
    setError,
    save: (patch: Parameters<typeof updateProfile.mutate>[0]) => {
      setError(null);
      setSaved(false);
      updateProfile.mutate(patch, {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => setError(err.message || 'That did not save. Try again.'),
      });
    },
  };
}

/**
 * Guard shared by all three rows: the tray is mounted while hidden, so each has to
 * tolerate an application that has not arrived, and stay away entirely for anyone
 * whose licence is not verified yet.
 */
function useVerifiedApplication(): OwnProfessional | null {
  const { data: application } = useOwnApplication();
  if (!application || application.status !== 'verified') return null;
  return application;
}

function RateForm({ application }: { application: OwnProfessional }) {
  const { pending, error, saved, setError, save } = useSave();
  const [rate, setRate] = useState(String(application.hourlyRate));

  const ceiling = calculateMaxRecommendedRate(application.yearsExperience);
  const parsed = Number(rate);
  const overCeiling = Number.isFinite(parsed) && parsed > ceiling;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(parsed) || parsed < PROFESSIONAL_MIN_RATE) {
      setError(`The lowest rate allowed is $${PROFESSIONAL_MIN_RATE}/hr.`);
      return;
    }
    if (parsed > PROFESSIONAL_MAX_RATE_CAP) {
      setError(`The highest rate allowed is $${PROFESSIONAL_MAX_RATE_CAP}/hr.`);
      return;
    }
    save({ hourlyRate: parsed });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Declared on the application and checked against the licence, so it is a
          record here rather than a field. */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <Lock className="h-3 w-3 shrink-0 text-slate-400" />
          Experience
        </span>
        <span className="text-xs font-bold text-slate-900">
          {application.yearsExperience} yr{application.yearsExperience === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-500">
        Your years of practice came from your application.{' '}
        <Link to="/contact" className="font-bold text-teal-800 underline">
          Ask an admin
        </Link>{' '}
        to correct it.
      </p>

      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-700">Consultation rate ($/hr)</span>
        <input
          type="number"
          inputMode="decimal"
          min={PROFESSIONAL_MIN_RATE}
          max={PROFESSIONAL_MAX_RATE_CAP}
          step={5}
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          className={FIELD}
          required
        />
      </label>
      <p className="text-[11px] leading-snug text-slate-500">
        Recommended up to <strong className="text-teal-900">${ceiling}/hr</strong> at{' '}
        {application.yearsExperience} yr{application.yearsExperience === 1 ? '' : 's'}.
      </p>
      {overCeiling && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-amber-800">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
          Above the recommendation — saving it flags your listing for review.
        </p>
      )}

      <SaveRow pending={pending} error={error} saved={saved} label="Save rate" />
    </form>
  );
}

function AvailabilityForm({ application }: { application: OwnProfessional }) {
  const { pending, error, saved, save } = useSave();
  const [status, setStatus] = useState<ProfessionalAvailabilityStatus>(
    application.availabilityStatus
  );
  const [schedule, setSchedule] = useState<WeeklyScheduleItem[]>(
    application.weeklySchedule.length > 0 ? application.weeklySchedule : defaultSchedule()
  );

  const edit = (day: string, change: Partial<WeeklyScheduleItem>) =>
    setSchedule((current) =>
      current.map((item) => (item.day === day ? { ...item, ...change } : item))
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({ availabilityStatus: status, weeklySchedule: schedule });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-700">Status in the directory</span>
        <div className="flex gap-1">
          {(Object.keys(STATUS_LABEL) as ProfessionalAvailabilityStatus[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`flex-1 ${PILL} ${status === value ? STATUS_ACTIVE[value] : PILL_IDLE}`}
            >
              {STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-700">Weekly hours</span>
        {/* One row per day, every day switchable — a vet who consults on a Sunday
            has to be able to say so. */}
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {DAYS.map(([day, short]) => {
            const item = schedule.find((one) => one.day === day);
            if (!item) return null;

            return (
              <li
                key={day}
                className={`flex items-center gap-2 px-2 py-1.5 ${
                  item.enabled ? '' : 'bg-slate-50'
                }`}
              >
                <label className="flex w-16 shrink-0 items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => edit(day, { enabled: !item.enabled })}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                  />
                  <span
                    className={`text-[11px] font-bold ${
                      item.enabled ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {short}
                  </span>
                </label>

                {item.enabled ? (
                  <span className="flex flex-1 items-center gap-1">
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(event) => edit(day, { startTime: event.target.value })}
                      className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-0.5 text-[11px] font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">–</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(event) => edit(day, { endTime: event.target.value })}
                      className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-0.5 text-[11px] font-semibold"
                    />
                  </span>
                ) : (
                  <span className="flex-1 text-[11px] italic text-slate-400">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <SaveRow pending={pending} error={error} saved={saved} label="Save availability" />
    </form>
  );
}

function ReminderForm({ application }: { application: OwnProfessional }) {
  const { pending, error, saved, save } = useSave();
  const [minutes, setMinutes] = useState<ProfessionalBookingNotificationTime>(
    application.bookingNotificationMinutes
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({ bookingNotificationMinutes: minutes });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <span className="block text-xs font-bold text-slate-700">
        Remind me before an appointment
      </span>
      <div className="flex gap-1">
        {PROFESSIONAL_BOOKING_NOTIFICATION_TIMES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMinutes(value)}
            className={`flex-1 ${PILL} ${minutes === value ? 'bg-teal-800 text-white' : PILL_IDLE}`}
          >
            {value} min
          </button>
        ))}
      </div>

      <SaveRow pending={pending} error={error} saved={saved} label="Save reminder" />
    </form>
  );
}

export function RateExperienceSection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  return (
    <TraySection
      label="💵 Experience & Rate"
      summary={`$${application.hourlyRate}/hr · ${application.yearsExperience} yr${
        application.yearsExperience === 1 ? '' : 's'
      } experience`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <RateForm application={application} />
    </TraySection>
  );
}

export function AvailabilitySection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  const open = application.weeklySchedule.filter((day) => day.enabled).length;

  return (
    <TraySection
      label="🗓️ Availability"
      summary={`${STATUS_LABEL[application.availabilityStatus]} · ${
        application.weeklySchedule.length === 0 ? 'no hours set' : `${open} of 7 days open`
      }`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <AvailabilityForm application={application} />
    </TraySection>
  );
}

export function BookingReminderSection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  return (
    <TraySection
      label="🔔 Booking Reminder"
      summary={`${application.bookingNotificationMinutes} min before an appointment`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ReminderForm application={application} />
    </TraySection>
  );
}
