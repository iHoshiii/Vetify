import type { Appointment, AppointmentDecision } from '@/services/appointments.service';

export type Action = AppointmentDecision | 'cancel';

// An action waiting on something typed, and what to call the box
export type Ask = { booking: Appointment; action: Action; label: string; placeholder: string };

const ACT = 'rounded px-3 py-1 text-xs font-bold transition-colors';
export const ACT_PRIMARY = `${ACT} bg-teal-800 text-white hover:bg-teal-900`;
export const ACT_QUIET = `${ACT} bg-slate-100 text-slate-800 hover:bg-slate-200`;
export const ACT_DANGER = `${ACT} text-rose-600 hover:bg-rose-50`;

// Confirming a clinic visit and marking one done need nothing typed: one says yes to a time already agreed, the other records what has happened
export function asks(booking: Appointment, action: Action): Ask | null {
  if (action === 'confirm' && booking.kind === 'virtual') {
    return {
      booking,
      action,
      label: 'Where does the call happen?',
      placeholder: 'https://meet.example.com/your-room',
    };
  }

  if (action === 'decline') {
    return {
      booking,
      action,
      label: 'Why can you not take it?',
      placeholder: 'I am on leave that whole week, sorry.',
    };
  }

  if (action === 'cancel') {
    return {
      booking,
      action,
      label: 'Why are you cancelling?',
      placeholder: 'An emergency surgery has run into that slot.',
    };
  }

  return null;
}
