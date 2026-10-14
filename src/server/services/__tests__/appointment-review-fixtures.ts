import type { ObjectId } from 'mongodb';
import { appointmentsCollection, findAppointmentById, insertAppointment } from '../../models';
import { decideAppointment, requestAppointment } from '../appointments.service';
import { bookingFixture } from './appointment-reliability-fixtures';

export async function confirmedBooking(kind: 'onsite' | 'virtual' = 'onsite') {
  const fixture = await bookingFixture();
  const booking =
    kind === 'onsite'
      ? (await requestAppointment(fixture.input))!.appointment
      : await insertAppointment({
          professional: fixture.professional._id,
          professionalUser: fixture.vet._id,
          client: fixture.owner._id,
          kind,
          startsAt: fixture.startsAt,
          minutes: 30,
          heldSlots: [fixture.startsAt],
          petSpecies: 'Dog',
          reason: fixture.input.reason,
          clientEmail: fixture.owner.email,
        });
  await decideAppointment({ id: booking._id, decision: 'confirmed', professional: fixture.vet });
  return { ...fixture, booking: (await findAppointmentById(booking._id))! };
}

export async function completedBooking() {
  const fixture = await confirmedBooking();
  await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  return { ...fixture, booking: (await findAppointmentById(fixture.booking._id))! };
}

export async function makeReviewDeliveryDue(id: ObjectId) {
  const booking = (await findAppointmentById(id))!;
  for (const task of booking.deliveries ?? []) {
    await appointmentsCollection().updateOne(
      { _id: id, 'deliveries.id': task.id },
      { $set: { 'deliveries.$.availableAt': new Date(0), 'deliveries.$.leaseUntil': new Date(0) } }
    );
  }
}
