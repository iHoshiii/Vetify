import type { AppointmentKind, AppointmentStatus } from '@shared/schemas';
import { Bell, CalendarCheck, Video } from 'lucide-react';

import BookingTabs, { type BookingTab } from './booking-tabs';

export const BOOKING_COPY: Record<AppointmentKind, { title: string; blurb: string }> = {
  virtual: {
    title: 'Online Consultation',
    blurb: 'Calls booked with you. Confirming one asks for the link the owner joins on.',
  },
  onsite: {
    title: 'Clinic Visit',
    blurb: 'Visits booked at your clinic. Every request holds its slot until you answer.',
  },
};

export default function BookingHeader({
  kind,
  minutes,
  tab,
  counts,
  onPick,
}: {
  kind: AppointmentKind;
  minutes: number;
  tab: BookingTab;
  counts?: Record<AppointmentStatus, number>;
  onPick: (next: BookingTab) => void;
}) {
  const copy = BOOKING_COPY[kind];

  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
      <div>
        <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
          {kind === 'virtual' ? (
            <Video className="h-4 w-4 text-teal-800" />
          ) : (
            <CalendarCheck className="h-4 w-4 text-teal-800" />
          )}
          {copy.title}
        </h1>
        <p className="text-xs text-slate-500">{copy.blurb}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-900">
          <Bell className="h-3 w-3 text-teal-700" />
          Reminder {minutes} min prior
        </p>
      </div>

      <BookingTabs active={tab} counts={counts} onPick={onPick} />
    </div>
  );
}
