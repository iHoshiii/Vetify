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

// The console settings rows: three forms a vet fills in, and one that only reports because placing a map pin needs a map

const DAYS = [
  ['Monday', 'Mon'],
  ['Tuesday', 'Tue'],
  ['Wednesday', 'Wed'],
  ['Thursday', 'Thu'],
  ['Friday', 'Fri'],
  ['Saturday', 'Sat'],
  ['Sunday', 'Sun'],
] as const;

const MAP_KIND_LABEL: Record<'clinic' | 'home', string> = { clinic: 'Clinic', home: 'Home' };

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
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

const PILL = 'rounded-md px-3 py-1.5 text-xs font-bold transition-colors';
const PILL_IDLE = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

interface SectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Every day open 09:00-17:00, for a vet who has never set hours
function defaultSchedule(): WeeklyScheduleItem[] {
  return DAYS.map(([day]) => ({ day, enabled: true, startTime: '09:00', endTime: '17:00' }));
}

// Mounted only while open, so an editor seeds its fields from the application at the moment somebody opens it rather than from whatever the query held on first paint
function SettingRow({
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
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold text-slate-800">{label}</span>
          <span className="block truncate text-sm text-slate-500">{summary}</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  );
}

// The submit button and the two things that can follow it, rather than copied into all three forms
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
        <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-900 disabled:opacity-50"
      >
        {pending ? 'Saving…' : label}
      </button>
    </>
  );
}

// Shared plumbing for the three forms. save takes only the keys that row owns, because the endpoint merges
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

// Guard shared by every row: nothing here is editable until a licence has been checked
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
      {/* Checked against the licence when they applied, so it is a record here rather than a field */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Experience
        </span>
        <span className="text-sm font-bold text-slate-900">
          {application.yearsExperience} yr{application.yearsExperience === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-xs leading-snug text-slate-500">
        Your years of practice came from your application.{' '}
        <Link to="/contact" className="font-bold text-teal-800 underline">
          Ask an admin
        </Link>{' '}
        to correct it.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">Consultation rate ($/hr)</span>
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
      <p className="text-xs leading-snug text-slate-500">
        Recommended up to <strong className="text-teal-900">${ceiling}/hr</strong> at{' '}
        {application.yearsExperience} yr{application.yearsExperience === 1 ? '' : 's'}.
      </p>
      {overCeiling && (
        <p className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-amber-800">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" />
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
        <span className="text-sm font-bold text-slate-700">Status in the directory</span>
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
        <span className="text-sm font-bold text-slate-700">Weekly hours</span>
        {/* Every day switchable, because a vet who consults on a Sunday has to be able to say so */}
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {DAYS.map(([day, short]) => {
            const item = schedule.find((one) => one.day === day);
            if (!item) return null;

            return (
              <li
                key={day}
                className={`flex items-center gap-3 px-3 py-2 ${item.enabled ? '' : 'bg-slate-50'}`}
              >
                <label className="flex w-20 shrink-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => edit(day, { enabled: !item.enabled })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                  />
                  <span
                    className={`text-xs font-bold ${
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
                      className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(event) => edit(day, { endTime: event.target.value })}
                      className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                    />
                  </span>
                ) : (
                  <span className="flex-1 text-xs italic text-slate-400">Closed</span>
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
      <span className="block text-sm font-bold text-slate-700">
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
    <SettingRow
      label="💵 Experience & Rate"
      summary={`$${application.hourlyRate}/hr · ${application.yearsExperience} yr${
        application.yearsExperience === 1 ? '' : 's'
      } experience`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <RateForm application={application} />
    </SettingRow>
  );
}

export function AvailabilitySection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  const open = application.weeklySchedule.filter((day) => day.enabled).length;

  return (
    <SettingRow
      label="🗓️ Availability"
      summary={`${STATUS_LABEL[application.availabilityStatus]} · ${
        application.weeklySchedule.length === 0 ? 'no hours set' : `${open} of 7 days open`
      }`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <AvailabilityForm application={application} />
    </SettingRow>
  );
}

export function BookingReminderSection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  return (
    <SettingRow
      label="🔔 Booking Reminder"
      summary={`${application.bookingNotificationMinutes} min before an appointment`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ReminderForm application={application} />
    </SettingRow>
  );
}

// Read-only, like the console page it links to: a location is fixed once the application is approved, so all a vet wants here is the answer to "am I on the map right now".
export function MapVisibilitySection({ isExpanded, onToggle }: SectionProps) {
  const application = useVerifiedApplication();
  if (!application) return null;

  const addresses = application.addresses ?? [];
  const shown = addresses.filter((address) => address.showOnMap);

  return (
    <SettingRow
      label="📍 Map & Location"
      summary={
        shown.length === 0
          ? 'Not on the public map'
          : `On the map: ${shown.map((address) => MAP_KIND_LABEL[address.kind]).join(', ')}`
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {addresses.length === 0 ? (
          <p className="text-xs leading-snug text-slate-500">
            There are no addresses on your application to pin.
          </p>
        ) : (
          addresses.map((address) => (
            <div
              key={address.kind}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-700">
                  {MAP_KIND_LABEL[address.kind]}
                </span>
                <span className="block truncate text-xs text-slate-500">{address.city}</span>
              </span>
              <span
                className={`shrink-0 text-xs font-bold ${
                  address.showOnMap ? 'text-teal-800' : 'text-slate-400'
                }`}
              >
                {address.showOnMap ? 'On the map' : address.mapPin ? 'Pinned, hidden' : 'No pin'}
              </span>
            </div>
          ))
        )}
      </div>

      <p className="text-xs leading-snug text-slate-500">
        These are the markers from your enquiry, published when you were approved.{' '}
        <Link to="/professionals/dashboard/location" className="font-bold text-teal-800 underline">
          Open Map &amp; Location
        </Link>{' '}
        to see them on a map. Email support.vetify@gmail.com to have one corrected.
      </p>
    </SettingRow>
  );
}
