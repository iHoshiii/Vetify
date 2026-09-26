import {
  claimReviewPrompt,
  completeConfirmed,
  findProfessionalById,
  findStartedConfirmed,
  findUserById,
  type AppointmentDocument,
} from '../models';
import { emitToUser } from '../realtime/hub';
import { reviewRequestEmail } from './appointment-mail';
import { deliverMail } from './mail.service';
import { createNotification } from './notifications.service';

// How often the scanner wakes.
const SCAN_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

// Tells both parties the booking flipped to completed, so a list open on the old status refetches. Mirrors the join/leave signal.
function announceCompletion(appointment: AppointmentDocument): void {
  const payload = { id: appointment._id.toString() };
  emitToUser(appointment.client.toString(), 'appointment:changed', payload);
  emitToUser(appointment.professionalUser.toString(), 'appointment:changed', payload);
}

// Nudges the owner to rate, once, and only for a booking they can actually rate: an onsite visit, a virtual call that connected, or a virtual no-show the booker showed up for. Completion always runs past the no-show grace, so a booking rateable by attendance here is rateable now.
async function promptReview(appointment: AppointmentDocument): Promise<void> {
  const rateable =
    appointment.kind === 'onsite' ||
    appointment.consultedAt !== null ||
    appointment.clientJoinedAt !== null;
  if (!rateable) return;

  // Claim before sending, so an overlapping tick cannot nudge twice.
  if (!(await claimReviewPrompt(appointment._id))) return;

  const [owner, application] = await Promise.all([
    findUserById(appointment.client),
    findProfessionalById(appointment.professional),
  ]);
  const professionalName = application?.fullName || 'your vet';
  const pet = appointment.petName ?? 'your pet';

  await createNotification({
    user: appointment.client,
    kind: 'review_request',
    appointment: appointment._id,
    appointmentKind: appointment.kind,
    title: 'How was your visit?',
    body: `Rate ${pet}'s visit with ${professionalName}.`,
  });

  // Email only when there is an address; a delivery error is swallowed since the visit is already behind them.
  const to = owner?.email ?? appointment.clientEmail;
  if (to) {
    await deliverMail(
      reviewRequestEmail({
        to,
        name: owner?.name ?? '',
        kind: appointment.kind,
        startsAt: appointment.startsAt,
        petName: pet,
        professionalName,
      })
    );
  }
}

// One pass: any confirmed booking whose end (startsAt + minutes) has passed becomes completed.
export async function scanCompletions(): Promise<void> {
  const now = new Date();
  const started = await findStartedConfirmed(now);

  for (const appointment of started) {
    // End is not stored, so recheck it here; startsAt <= now only means it began.
    const endMs = appointment.startsAt.getTime() + appointment.minutes * 60_000;
    if (endMs > now.getTime()) continue;

    const done = await completeConfirmed(appointment._id);
    if (!done) continue;
    announceCompletion(done);
    await promptReview(done);
  }
}

// Starts the background sweep once. Unref'd so a pending tick never holds the process open at shutdown.
export function startCompletionScanner(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scanCompletions().catch((err) => console.error('[completions] scan failed', err));
  }, SCAN_INTERVAL_MS);
  timer.unref();
}

export function stopCompletionScanner(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
