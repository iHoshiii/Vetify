import { PROFESSIONAL_BOOKING_NOTIFICATION_TIMES } from '@shared/limits';

import { claimReminder, findProfessionalById, findRemindableAppointments } from '../models';
import { createNotification } from './notifications.service';

// How often the scanner wakes, and the furthest-ahead lead any vet can set.
const SCAN_INTERVAL_MS = 60_000;
const MAX_LEAD_MINUTES = Math.max(...PROFESSIONAL_BOOKING_NOTIFICATION_TIMES);
// The settings default, used when a vet never chose a lead time.
const DEFAULT_LEAD_MINUTES = 30;

let timer: ReturnType<typeof setInterval> | null = null;

// One pass: reminds the vet of every confirmed booking now inside its own lead window, once each.
export async function scanReminders(): Promise<void> {
  const now = new Date();
  const horizon = new Date(now.getTime() + MAX_LEAD_MINUTES * 60_000);
  const due = await findRemindableAppointments({ from: now, to: horizon });

  for (const appointment of due) {
    const application = await findProfessionalById(appointment.professional);
    const lead = application?.bookingNotificationMinutes ?? DEFAULT_LEAD_MINUTES;
    // Not yet inside this vet's own lead: it was only pulled by the widest window above.
    if (now.getTime() < appointment.startsAt.getTime() - lead * 60_000) continue;

    // Claim before sending, so an overlapping tick cannot push the same reminder twice.
    if (!(await claimReminder(appointment._id))) continue;

    const inMinutes = Math.max(
      1,
      Math.round((appointment.startsAt.getTime() - now.getTime()) / 60_000)
    );
    await createNotification({
      user: appointment.professionalUser,
      kind: 'booking_reminder',
      appointment: appointment._id,
      title: 'Appointment starting soon',
      body: `${appointment.petName ?? 'A pet'}'s appointment starts in about ${inMinutes} minutes.`,
    });
  }
}

// Starts the background scan once. Unref'd so a pending tick never holds the process open at shutdown.
export function startReminderScanner(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scanReminders().catch((err) => console.error('[reminders] scan failed', err));
  }, SCAN_INTERVAL_MS);
  timer.unref();
}

export function stopReminderScanner(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
