import type { Appointment } from '@/services/appointments.service';
import { Video } from 'lucide-react';

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
        {booking.meetingUrl && (
          <a
            href={booking.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 ${ACT_PRIMARY}`}
          >
            <Video className="h-3 w-3" /> Join call
          </a>
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
