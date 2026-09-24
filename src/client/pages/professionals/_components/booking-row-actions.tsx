import type { Appointment } from '@/services/appointments.service';

import StartSessionButton from '@/pages/call/start-session-button';

import { ACT_DANGER, ACT_PRIMARY, ACT_QUIET, type Action } from './booking-actions';

// Keyed off status, so an answered booking offers nothing and no button can lead to a 409.
export default function BookingRowActions({
  booking,
  onAct,
}: {
  booking: Appointment;
  onAct: (booking: Appointment, action: Action) => void;
}) {
  if (booking.status === 'requested') {
    return (
      <>
        <button type="button" onClick={() => onAct(booking, 'confirm')} className={ACT_PRIMARY}>
          Confirm
        </button>
        <button type="button" onClick={() => onAct(booking, 'decline')} className={ACT_DANGER}>
          Turn down
        </button>
      </>
    );
  }

  if (booking.status === 'confirmed') {
    return (
      <>
        {booking.kind === 'virtual' && (
          <StartSessionButton
            appointmentId={booking.id}
            startsAt={booking.startsAt}
            minutes={booking.minutes}
            variant="inline"
          />
        )}
        <button type="button" onClick={() => onAct(booking, 'complete')} className={ACT_QUIET}>
          Mark done
        </button>
        <button type="button" onClick={() => onAct(booking, 'cancel')} className={ACT_DANGER}>
          Cancel
        </button>
      </>
    );
  }

  return null;
}
