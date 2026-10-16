import type { Appointment } from '../../src/client/services/appointments.service';
import { DATE, OTHER_ID, VET_ID, vet } from './data';

export const appointment: Appointment = {
  id: 'e'.repeat(24),
  kind: 'virtual',
  status: 'confirmed',
  startsAt: new Date(Date.now() + 86400000).toISOString(),
  endsAt: new Date(Date.now() + 90000000).toISOString(),
  minutes: 60,
  petName: 'Milo',
  petSpecies: 'Dog',
  petBreed: 'Mixed breed',
  petAge: '2 years',
  reason: 'Routine health and nutrition consultation for our family pet. '.repeat(5),
  phone: '+639123456789',
  meetingUrl: null,
  refusalReason: null,
  cancelledByYou: false,
  with: { id: OTHER_ID, name: vet.name, email: 'vet@example.test', avatarUrl: null },
  professionalId: VET_ID,
  consultedAt: null,
  clientJoinedAt: null,
  rating: null,
  ratingComment: null,
  decidedAt: DATE,
  createdAt: DATE,
};
