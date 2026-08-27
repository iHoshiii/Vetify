import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Bell, CalendarCheck, CheckCircle2, Clock, MessageSquare, Video } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  SAMPLE_APPOINTMENTS,
  type Appointment,
  type AppointmentStatus,
} from './_components/console-sample-data';
import { useConsoleApplication } from './professional-layout';

const FILTERS: Array<AppointmentStatus | 'all'> = [
  'all',
  'confirmed',
  'pending',
  'completed',
  'cancelled',
];

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

/**
 * What an action can turn a booking into: a request can be confirmed, and a
 * confirmed consultation ends either as done or as called off.
 */
type Act = Extract<AppointmentStatus, 'confirmed' | 'completed' | 'cancelled'>;

function Metric({
  label,
  value,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</dd>
    </div>
  );
}

export default function ProfessionalAppointmentsPage() {
  useDocumentTitle('Appointments', 'Client bookings and consultation requests.');

  const { bookingNotificationMinutes } = useConsoleApplication();

  const [appointments, setAppointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [flash, setFlash] = useState<string | null>(null);

  const act = (id: string, status: Act) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setFlash(`${id} marked ${status}.`);
    setTimeout(() => setFlash(null), 3000);
  };

  const visible = appointments.filter((a) => filter === 'all' || a.status === filter);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Upcoming"
          value={appointments.filter((a) => a.status === 'confirmed').length}
        />
        <Metric
          label="Pending requests"
          value={appointments.filter((a) => a.status === 'pending').length}
          valueClass="text-amber-600"
        />
        <Metric
          label="Reminder lead time"
          value={
            <span className="flex items-center gap-1 text-base font-bold text-teal-800">
              <Bell className="h-3.5 w-3.5" /> {bookingNotificationMinutes} min prior
            </span>
          }
        />
      </dl>

      {flash && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash}
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
              <CalendarCheck className="h-4 w-4 text-teal-800" />
              Appointments
            </h1>
            <p className="text-xs text-slate-500">
              Client bookings and scheduled consultation requests.
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded px-2.5 py-1 font-bold capitalize transition-colors ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No appointments under this filter.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((booking) => (
              <li
                key={booking.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-2.5 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{booking.id}</span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-bold capitalize ${
                        STATUS_CLASS[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {booking.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Clock className="h-3.5 w-3.5 text-teal-700" />
                    {booking.date} · {booking.timeSlot}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Client
                    </span>
                    <p className="font-bold text-slate-900">{booking.clientName}</p>
                    <p className="text-slate-500">{booking.clientEmail}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pet Patient
                    </span>
                    <p className="font-bold text-slate-900">
                      {booking.petName} ({booking.petSpecies})
                    </p>
                    <p className="text-slate-500">{booking.petBreed}</p>
                  </div>
                </div>

                {booking.notes && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                    <strong className="font-bold text-slate-900">Notes:</strong> {booking.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Bell className="h-3 w-3 text-teal-700" />
                    Reminder {bookingNotificationMinutes} min prior
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {booking.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => act(booking.id, 'confirmed')}
                        className="rounded bg-teal-800 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-teal-900"
                      >
                        Confirm
                      </button>
                    )}

                    {booking.status === 'confirmed' && (
                      <>
                        <Link
                          to="/chat"
                          className="inline-flex items-center gap-1 rounded bg-teal-800 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-teal-900"
                        >
                          <Video className="h-3 w-3" /> Join call
                        </Link>
                        <button
                          type="button"
                          onClick={() => act(booking.id, 'completed')}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200"
                        >
                          <MessageSquare className="h-3 w-3" /> Mark completed
                        </button>
                      </>
                    )}

                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => act(booking.id, 'cancelled')}
                        className="rounded px-2.5 py-1 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
